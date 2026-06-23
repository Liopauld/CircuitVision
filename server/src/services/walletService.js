import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { ApiError } from '../middleware/errorHandler.js';

// Mutates a user's spendable balance (walletBalance) and records the change as
// a WalletTransaction. `delta` may be negative. Used for top_up / debit /
// credit / refund / adjustment where money enters or leaves the spendable
// balance. Reserve/release move money between walletBalance and reservedBalance
// and are handled by `moveToReserved` / `releaseReserved` below.
export async function applyBalanceChange(
  user,
  { type, amount, delta, referenceOrderId = null, description = '' }
) {
  const before = user.walletBalance;
  const after = before + delta;
  if (after < 0) {
    throw new ApiError(400, 'Insufficient wallet balance.');
  }
  user.walletBalance = after;
  await user.save();

  await WalletTransaction.create({
    userId: user._id,
    type,
    amount,
    referenceOrderId,
    description,
    balanceBefore: before,
    balanceAfter: after,
  });

  return user;
}

// Soft-hold: move `amount` from spendable balance into reservedBalance.
export async function moveToReserved(user, amount, referenceOrderId, description) {
  if (user.walletBalance < amount) {
    throw new ApiError(400, 'Insufficient wallet balance to place this order.');
  }
  const before = user.walletBalance;
  user.walletBalance -= amount;
  user.reservedBalance += amount;
  await user.save();

  await WalletTransaction.create({
    userId: user._id,
    type: 'reserve',
    amount,
    referenceOrderId,
    description,
    balanceBefore: before,
    balanceAfter: user.walletBalance,
  });
}

// Release a previously reserved amount back to spendable balance.
export async function releaseReserved(user, amount, referenceOrderId, description) {
  const before = user.walletBalance;
  user.reservedBalance = Math.max(0, user.reservedBalance - amount);
  user.walletBalance += amount;
  await user.save();

  await WalletTransaction.create({
    userId: user._id,
    type: 'release',
    amount,
    referenceOrderId,
    description,
    balanceBefore: before,
    balanceAfter: user.walletBalance,
  });
}

// Settle a verified payment: take the reserved amount off the buyer for good
// (debit) and credit the seller's spendable balance.
export async function settlePayment(buyer, seller, amount, referenceOrderId) {
  // Buyer: remove from reserved (already left walletBalance at reserve time).
  const buyerBefore = buyer.walletBalance;
  buyer.reservedBalance = Math.max(0, buyer.reservedBalance - amount);
  await buyer.save();
  await WalletTransaction.create({
    userId: buyer._id,
    type: 'debit',
    amount,
    referenceOrderId,
    description: 'Payment for order',
    balanceBefore: buyerBefore,
    balanceAfter: buyer.walletBalance,
  });

  // Seller: credit spendable balance.
  await applyBalanceChange(seller, {
    type: 'credit',
    amount,
    delta: amount,
    referenceOrderId,
    description: 'Sale proceeds',
  });
}
