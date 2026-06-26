import { WalletTransaction } from '../models/WalletTransaction.js';
import { ApiError } from '../middleware/errorHandler.js';

// Every helper takes an optional Mongoose `session` (last arg). When the caller
// runs inside a transaction it threads the session through so the balance write
// and its WalletTransaction audit record commit (or roll back) together; when
// null the writes behave exactly as before. A balance change is always paired
// 1:1 with an audit row that snapshots balanceBefore/balanceAfter.

async function recordTransaction(doc, session) {
  await new WalletTransaction(doc).save({ session });
}

// Mutates a user's spendable balance (walletBalance) and records the change as
// a WalletTransaction. `delta` may be negative. Used for top_up / debit /
// credit / refund / adjustment where money enters or leaves the spendable
// balance. Reserve/release move money between walletBalance and reservedBalance
// and are handled by `moveToReserved` / `releaseReserved` below.
export async function applyBalanceChange(
  user,
  { type, amount, delta, referenceOrderId = null, description = '' },
  session = null
) {
  const before = user.walletBalance;
  const after = before + delta;
  if (after < 0) {
    throw new ApiError(400, 'Insufficient wallet balance.');
  }
  user.walletBalance = after;
  await user.save({ session });

  await recordTransaction(
    {
      userId: user._id,
      type,
      amount,
      referenceOrderId,
      description,
      balanceBefore: before,
      balanceAfter: after,
    },
    session
  );

  return user;
}

// Soft-hold: move `amount` from spendable balance into reservedBalance.
export async function moveToReserved(user, amount, referenceOrderId, description, session = null) {
  if (user.walletBalance < amount) {
    throw new ApiError(400, 'Insufficient wallet balance to place this order.');
  }
  const before = user.walletBalance;
  user.walletBalance -= amount;
  user.reservedBalance += amount;
  await user.save({ session });

  await recordTransaction(
    {
      userId: user._id,
      type: 'reserve',
      amount,
      referenceOrderId,
      description,
      balanceBefore: before,
      balanceAfter: user.walletBalance,
    },
    session
  );
}

// Release a previously reserved amount back to spendable balance.
export async function releaseReserved(user, amount, referenceOrderId, description, session = null) {
  const before = user.walletBalance;
  user.reservedBalance = Math.max(0, user.reservedBalance - amount);
  user.walletBalance += amount;
  await user.save({ session });

  await recordTransaction(
    {
      userId: user._id,
      type: 'release',
      amount,
      referenceOrderId,
      description,
      balanceBefore: before,
      balanceAfter: user.walletBalance,
    },
    session
  );
}

// Settle a verified payment: take the reserved amount off the buyer for good
// (debit) and credit the seller's spendable balance.
export async function settlePayment(buyer, seller, amount, referenceOrderId, session = null) {
  // Buyer: remove from reserved (already left walletBalance at reserve time).
  const buyerBefore = buyer.walletBalance;
  buyer.reservedBalance = Math.max(0, buyer.reservedBalance - amount);
  await buyer.save({ session });
  await recordTransaction(
    {
      userId: buyer._id,
      type: 'debit',
      amount,
      referenceOrderId,
      description: 'Payment for order',
      balanceBefore: buyerBefore,
      balanceAfter: buyer.walletBalance,
    },
    session
  );

  // Seller: credit spendable balance.
  await applyBalanceChange(
    seller,
    {
      type: 'credit',
      amount,
      delta: amount,
      referenceOrderId,
      description: 'Sale proceeds',
    },
    session
  );
}

// Reverse a settled payment after a dispute resolution: claw `amount` back from
// the seller and refund it to the buyer. Retained for reference; the current
// escrow model resolves disputes against still-reserved funds, so this is no
// longer called. This is a mock wallet, so the seller may go negative.
export async function refundSettledPayment(seller, buyer, amount, referenceOrderId, session = null) {
  // Seller: debit (bypasses applyBalanceChange's non-negative guard on purpose).
  const sellerBefore = seller.walletBalance;
  seller.walletBalance -= amount;
  await seller.save({ session });
  await recordTransaction(
    {
      userId: seller._id,
      type: 'debit',
      amount,
      referenceOrderId,
      description: 'Dispute refund — reversed sale proceeds',
      balanceBefore: sellerBefore,
      balanceAfter: seller.walletBalance,
    },
    session
  );

  // Buyer: refund to spendable balance.
  await applyBalanceChange(
    buyer,
    {
      type: 'refund',
      amount,
      delta: amount,
      referenceOrderId,
      description: 'Dispute refund',
    },
    session
  );
}
