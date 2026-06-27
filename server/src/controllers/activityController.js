import { Order } from '../models/Order.js';
import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';

// GET /api/activity — a public, recent activity feed for the homepage ticker:
// recent sales, new listings, and fresh reviews. No buyer names (privacy) —
// just enough to convey a lively, active marketplace.
export async function getActivity(req, res) {
  const [sales, listings, reviews] = await Promise.all([
    Order.find({ status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('titleSnapshot updatedAt')
      .lean(),
    Listing.find({ status: 'available' })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('title createdAt')
      .lean(),
    Review.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('sellerId', 'name')
      .select('rating createdAt sellerId')
      .lean(),
  ]);

  const events = [
    ...sales.map((s) => ({ type: 'sale', text: `${s.titleSnapshot} just sold`, at: s.updatedAt })),
    ...listings.map((l) => ({ type: 'listing', text: `New: ${l.title}`, at: l.createdAt })),
    ...reviews.map((r) => ({
      type: 'review',
      text: `${r.rating}★ review for ${r.sellerId?.name || 'a seller'}`,
      at: r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 14);

  res.json({ events });
}
