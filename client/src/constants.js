// Shared option lists + display helpers mirroring the server-side enums.
export const CATEGORIES = [
  { value: 'esp32', label: 'ESP32' },
  { value: 'raspi', label: 'Raspberry Pi' },
  { value: 'arduino', label: 'Arduino' },
];

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
];

export const LISTING_STATUSES = [
  'pending',
  'available',
  'reserved',
  'sold',
  'rejected',
];

export const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value;

export const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

// ---- Order lifecycle (must match server Order model) ----
export const ORDER_STEPS = [
  'awaiting_payment',
  'payment_submitted',
  'payment_verified',
  'preparing',
  'ready',
  'completed',
];

export const ORDER_LABELS = {
  awaiting_payment: 'Awaiting Payment',
  payment_submitted: 'Payment Submitted',
  payment_verified: 'Payment Verified',
  preparing: 'Preparing',
  ready: 'Ready / Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

// Which actions each party can take, given the current order status.
// Mirrors the server transition table for UI affordances.
export function availableActions(order, viewerRole) {
  const s = order.status;
  if (viewerRole === 'buyer') {
    if (s === 'awaiting_payment')
      return [
        { action: 'submit_payment', label: 'Pay now', kind: 'btn' },
        { action: 'cancel', label: 'Cancel', kind: 'btn ghost' },
      ];
    if (s === 'payment_submitted')
      return [{ action: 'cancel', label: 'Cancel', kind: 'btn ghost' }];
    if (s === 'ready')
      return [{ action: 'complete', label: 'Confirm received', kind: 'btn' }];
  }
  if (viewerRole === 'seller') {
    if (s === 'payment_submitted')
      return [{ action: 'verify_payment', label: 'Verify payment', kind: 'btn' }];
    if (s === 'payment_verified')
      return [{ action: 'prepare', label: 'Mark preparing', kind: 'btn' }];
    if (s === 'preparing')
      return [{ action: 'ship', label: 'Mark ready / shipped', kind: 'btn' }];
    if (['awaiting_payment', 'payment_submitted'].includes(s))
      return [{ action: 'cancel', label: 'Cancel order', kind: 'btn ghost' }];
  }
  return [];
}

// ---- Wallet transaction display ----
export const TX_META = {
  top_up: { sign: '+', label: 'Top-up', glyph: '↑' },
  reserve: { sign: '−', label: 'Reserved', glyph: '⏸' },
  release: { sign: '+', label: 'Released', glyph: '↩' },
  debit: { sign: '−', label: 'Payment', glyph: '→' },
  credit: { sign: '+', label: 'Sale', glyph: '←' },
  refund: { sign: '+', label: 'Refund', glyph: '↩' },
  adjustment: { sign: '±', label: 'Adjustment', glyph: '⚙' },
};
