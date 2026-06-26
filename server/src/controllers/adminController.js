import { Listing, listingExpiry } from '../models/Listing.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { applyBalanceChange } from '../services/walletService.js';
import { ApiError } from '../middleware/errorHandler.js';

// GET /api/admin/listings?status=pending — moderation queue (defaults pending).
export async function adminListListings(req, res) {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const listings = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('sellerId', 'name email')
    .lean();
  res.json({ listings });
}

// POST /api/admin/listings/:id/approve
export async function approveListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  listing.status = 'available';
  listing.expiresAt = listingExpiry(); // starts the live window
  await listing.save();
  res.json({ listing });
}

// POST /api/admin/listings/:id/reject
export async function rejectListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  listing.status = 'rejected';
  await listing.save();
  res.json({ listing });
}

// PATCH /api/admin/listings/:id/category — override a misclassified category.
export async function overrideCategory(req, res) {
  const { category } = req.body;
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  listing.category = category;
  await listing.save(); // schema enum validates the value
  res.json({ listing });
}

// GET /api/admin/users
export async function adminListUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isBanned: u.isBanned,
      walletBalance: u.walletBalance,
      reservedBalance: u.reservedBalance,
      createdAt: u.createdAt,
    })),
  });
}

// POST /api/admin/users/:id/ban  { banned: true|false }
export async function setUserBan(req, res) {
  const banned = req.body.banned !== false;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === 'admin') {
    throw new ApiError(400, 'Cannot ban an admin account.');
  }
  user.isBanned = banned;
  await user.save();
  res.json({ user: user.toPublicJSON() });
}

// POST /api/admin/users/:id/role  { role } — change a user's role (e.g. promote
// a customer to seller) without editing the DB by hand.
export async function setUserRole(req, res) {
  const { role } = req.body;
  if (!['customer', 'seller', 'admin'].includes(role)) {
    throw new ApiError(400, 'Role must be customer, seller, or admin.');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === 'admin' && role !== 'admin') {
    throw new ApiError(400, 'Cannot demote an admin account.');
  }
  user.role = role;
  await user.save();
  res.json({ user: user.toPublicJSON() });
}

// POST /api/admin/users/:id/adjust  { amount, description } — manual wallet fix.
export async function adjustWallet(req, res) {
  const amount = Number(req.body.amount); // may be negative
  if (!amount) throw new ApiError(400, 'A non-zero amount is required.');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  await applyBalanceChange(user, {
    type: 'adjustment',
    amount: Math.abs(amount),
    delta: amount,
    description: req.body.description || 'Admin adjustment',
  });
  res.json({ user: user.toPublicJSON() });
}

// GET /api/admin/orders — all orders.
export async function adminListOrders(req, res) {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('buyerId', 'name')
    .populate('sellerId', 'name')
    .lean();
  res.json({ orders });
}

// GET /api/admin/transactions — all wallet activity.
export async function adminListTransactions(req, res) {
  const transactions = await WalletTransaction.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name')
    .lean();
  res.json({ transactions });
}

// GET /api/admin/stats — platform analytics: inventory by category, GMV, active
// users, a 7-day revenue trend, and the top sellers.
export async function adminStats(req, res) {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [byCategory, salesAgg, userCount, pendingCount, trendRaw, topRaw] =
    await Promise.all([
      Listing.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, volume: { $sum: '$amountReserved' }, count: { $sum: 1 } } },
      ]),
      User.countDocuments({ isBanned: false }),
      Listing.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: 'completed', updatedAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            revenue: { $sum: '$amountReserved' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$sellerId',
            revenue: { $sum: '$amountReserved' },
            units: { $sum: '$quantity' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
        { $unwind: '$seller' },
        { $project: { _id: 0, sellerId: '$_id', name: '$seller.name', revenue: 1, units: 1 } },
      ]),
    ]);

  // Dense 7-day trend (fill gaps with 0).
  const trendMap = new Map(trendRaw.map((t) => [t._id, t.revenue]));
  const revenueTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    revenueTrend.push({ date: key, revenue: trendMap.get(key) || 0 });
  }

  res.json({
    listingsByCategory: byCategory.reduce(
      (acc, c) => ({ ...acc, [c._id]: c.count }),
      {}
    ),
    completedSales: salesAgg[0]?.count || 0,
    salesVolume: salesAgg[0]?.volume || 0,
    activeUsers: userCount,
    pendingListings: pendingCount,
    revenueTrend,
    topSellers: topRaw,
  });
}
