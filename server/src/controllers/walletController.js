import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { applyBalanceChange } from '../services/walletService.js';
import { ApiError } from '../middleware/errorHandler.js';

const MAX_TOPUP = 100000; // sanity cap for the mock top-up form

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

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.');

  await applyBalanceChange(user, {
    type: 'top_up',
    amount,
    delta: amount,
    description: 'Wallet top-up',
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
