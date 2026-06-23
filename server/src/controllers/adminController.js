import { Listing } from '../models/Listing.js';
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
    .populate('sellerId', 'name email')
    .lean();
  res.json({ listings });
}

// POST /api/admin/listings/:id/approve
export async function approveListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  listing.status = 'available';
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
  const users = await User.find().sort({ createdAt: -1 }).lean();
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

// GET /api/admin/stats — inventory by category, sales volume, active users.
export async function adminStats(req, res) {
  const [byCategory, salesAgg, userCount, pendingCount] = await Promise.all([
    Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, volume: { $sum: '$amountReserved' }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ isBanned: false }),
    Listing.countDocuments({ status: 'pending' }),
  ]);

  res.json({
    listingsByCategory: byCategory.reduce(
      (acc, c) => ({ ...acc, [c._id]: c.count }),
      {}
    ),
    completedSales: salesAgg[0]?.count || 0,
    salesVolume: salesAgg[0]?.volume || 0,
    activeUsers: userCount,
    pendingListings: pendingCount,
  });
}
