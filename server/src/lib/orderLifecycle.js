// Pure order-lifecycle logic — the transition table, listing-stock math, and
// dispute-outcome resolution. Deliberately free of DB / HTTP concerns so it can
// be unit-tested in isolation; controllers translate these results into model
// writes and ApiError throws.

// Transition table. For each action: which order statuses it is valid from,
// which party (relative to the order) may perform it, and the resulting status.
export const TRANSITIONS = {
  submit_payment: { from: ['awaiting_payment'], by: ['buyer'], to: 'payment_submitted' },
  verify_payment: { from: ['payment_submitted'], by: ['seller', 'admin'], to: 'payment_verified' },
  prepare: { from: ['payment_verified'], by: ['seller', 'admin'], to: 'preparing' },
  ship: { from: ['preparing'], by: ['seller', 'admin'], to: 'ready' },
  complete: { from: ['ready'], by: ['buyer', 'admin'], to: 'completed' },
  cancel: {
    from: ['awaiting_payment', 'payment_submitted'],
    by: ['buyer', 'seller', 'admin'],
    to: 'cancelled',
  },
  // Disputes are owned by disputeController, so 'disputed' is not in this table.
};

// Validate a proposed transition. Returns { ok: true, to } when allowed, or
// { ok: false, code, message } describing why it isn't.
export function evaluateTransition(status, actor, action) {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, code: 400, message: `Unknown action: ${action}.` };
  const verb = action.replace('_', ' ');
  if (!actor) {
    return { ok: false, code: 403, message: 'You are not a participant in this order.' };
  }
  if (!rule.by.includes(actor)) {
    return { ok: false, code: 403, message: `Only the ${rule.by.join('/')} can ${verb}.` };
  }
  if (!rule.from.includes(status)) {
    return { ok: false, code: 409, message: `Cannot ${verb} an order that is ${status}.` };
  }
  return { ok: true, to: rule.to };
}

// A listing holds `quantity` identical units. Drawing down on an order keeps it
// browsable while units remain; it only flips to 'reserved' when the last unit
// is claimed.
export function drawDownStock(quantity, qty) {
  const remaining = quantity - qty;
  return { quantity: remaining, status: remaining > 0 ? 'available' : 'reserved' };
}

// Listing status once an order completes (units were already drawn down): sold
// only when stock is exhausted, otherwise still available.
export function finalizeStockStatus(quantity) {
  return quantity > 0 ? 'available' : 'sold';
}

// Resolve a dispute's financial + lifecycle outcome. Funds are still escrowed in
// the buyer's reserved balance, so the outcome splits that reserve rather than
// clawing back a settled payment.
//   refund  -> full refund to buyer, order cancelled, units returned to stock
//   partial -> refundAmount to buyer, remainder to seller, order completed
//   release/none -> seller keeps everything, order completed
export function resolveDisputeOutcome(amountReserved, resolution, refundAmount) {
  if (resolution === 'refund') {
    return {
      ok: true,
      refundToBuyer: amountReserved,
      toSeller: 0,
      orderStatus: 'cancelled',
      listingStatus: 'available',
      restock: true,
    };
  }
  if (resolution === 'partial') {
    const refund = Number(refundAmount);
    if (!refund || refund <= 0 || refund >= amountReserved) {
      return {
        ok: false,
        code: 400,
        message: `Partial refund must be between 0 and ${amountReserved}.`,
      };
    }
    return {
      ok: true,
      refundToBuyer: refund,
      toSeller: amountReserved - refund,
      orderStatus: 'completed',
      listingStatus: 'sold',
      restock: false,
    };
  }
  // 'release' or 'none' — seller keeps the funds.
  return {
    ok: true,
    refundToBuyer: 0,
    toSeller: amountReserved,
    orderStatus: 'completed',
    listingStatus: 'sold',
    restock: false,
  };
}
