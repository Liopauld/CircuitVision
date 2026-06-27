import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { applyBalanceChange } from '../services/walletService.js';
import { runInTransaction } from '../lib/transaction.js';
import { ApiError } from '../middleware/errorHandler.js';

const MAX_TOPUP = 100000; // sanity cap for the mock top-up form
const DAY = 24 * 60 * 60 * 1000;
const DAILY_BASE = 50; // base reward; +10 per streak day, capped at day 7

// Reward for the n-th consecutive day (₱60 day 1 → ₱120 day 7+).
const rewardFor = (streak) => DAILY_BASE + Math.min(streak, 7) * 10;

// GET /api/wallet — current balance + reserved.
export async function getWallet(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({
    walletBalance: user.walletBalance,
    reservedBalance: user.reservedBalance,
  });
}

// POST /api/wallet/topup — simulated top-up (no real gateway).
export async function topUp(req, res) {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    throw new ApiError(400, 'Top-up amount must be a positive number.');
  }
  if (amount > MAX_TOPUP) {
    throw new ApiError(400, `Top-up cannot exceed ₱${MAX_TOPUP.toLocaleString()}.`);
  }

  const user = await runInTransaction(async (session) => {
    const u = await User.findById(req.user.id).session(session);
    if (!u) throw new ApiError(404, 'User not found.');
    await applyBalanceChange(
      u,
      { type: 'top_up', amount, delta: amount, description: 'Wallet top-up' },
      session
    );
    return u;
  });

  res.json({
    walletBalance: user.walletBalance,
    reservedBalance: user.reservedBalance,
  });
}

// GET /api/wallet/transactions — full wallet history, newest first.
export async function getTransactions(req, res) {
  const transactions = await WalletTransaction.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ transactions });
}

// GET /api/wallet/daily — is today's reward claimable, current streak, amount.
export async function dailyStatus(req, res) {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw new ApiError(404, 'User not found.');
  const now = Date.now();
  const last = user.lastDailyReward ? new Date(user.lastDailyReward).getTime() : 0;
  const claimable = !last || now - last >= DAY;
  // A claim continues the streak only if the previous one was within 48h.
  const continues = last > 0 && now - last < 2 * DAY;
  const nextStreak = claimable ? (continues ? (user.dailyStreak || 0) + 1 : 1) : user.dailyStreak || 0;
  res.json({
    claimable,
    streak: user.dailyStreak || 0,
    amount: rewardFor(nextStreak),
    nextClaimAt: last ? new Date(last + DAY) : null,
  });
}

// POST /api/wallet/daily — claim the daily reward (once per 24h).
export async function claimDaily(req, res) {
  const out = await runInTransaction(async (session) => {
    const u = await User.findById(req.user.id).session(session);
    if (!u) throw new ApiError(404, 'User not found.');
    const now = Date.now();
    const last = u.lastDailyReward ? u.lastDailyReward.getTime() : 0;
    if (last && now - last < DAY) {
      throw new ApiError(429, 'Daily reward already claimed — come back later.');
    }
    const continues = last > 0 && now - last < 2 * DAY;
    u.dailyStreak = continues ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDailyReward = new Date(now);
    const amount = rewardFor(u.dailyStreak);
    await applyBalanceChange(
      u,
      { type: 'bonus', amount, delta: amount, description: `Daily reward — day ${u.dailyStreak}` },
      session
    );
    return { amount, streak: u.dailyStreak, walletBalance: u.walletBalance };
  });
  res.json(out);
}
