// Shared option lists + display helpers, mirroring the server enums.
// Ported from the web client's constants.js.

export const CATEGORIES = [
  { value: 'esp32', label: 'ESP32' },
  { value: 'raspi', label: 'Raspberry Pi' },
  { value: 'arduino', label: 'Arduino' },
] as const;

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
] as const;

export const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label || value;

export const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

// ---- Order lifecycle (must match server Order model) ----
export const ORDER_STEPS = [
  'awaiting_payment',
  'payment_submitted',
  'payment_verified',
  'preparing',
  'ready',
  'completed',
] as const;

export const ORDER_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  payment_submitted: 'Payment Submitted',
  payment_verified: 'Payment Verified',
  preparing: 'Preparing',
  ready: 'Ready / Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export type OrderAction = { action: string; label: string; kind: 'primary' | 'ghost' };

// Which actions each party can take, given the current order status.
// Mirrors the server transition table for UI affordances.
export function availableActions(
  order: { status: string },
  viewerRole: 'buyer' | 'seller' | 'admin'
): OrderAction[] {
  const s = order.status;
  if (viewerRole === 'buyer') {
    if (s === 'awaiting_payment')
      return [
        { action: 'submit_payment', label: 'Pay now', kind: 'primary' },
        { action: 'cancel', label: 'Cancel', kind: 'ghost' },
      ];
    if (s === 'payment_submitted')
      return [{ action: 'cancel', label: 'Cancel', kind: 'ghost' }];
    if (s === 'ready')
      return [{ action: 'complete', label: 'Confirm received', kind: 'primary' }];
  }
  if (viewerRole === 'seller') {
    if (s === 'payment_submitted')
      return [{ action: 'verify_payment', label: 'Verify payment', kind: 'primary' }];
    if (s === 'payment_verified')
      return [{ action: 'prepare', label: 'Mark preparing', kind: 'primary' }];
    if (s === 'preparing')
      return [{ action: 'ship', label: 'Mark ready / shipped', kind: 'primary' }];
    if (s === 'awaiting_payment' || s === 'payment_submitted')
      return [{ action: 'cancel', label: 'Cancel order', kind: 'ghost' }];
  }
  return [];
}

export const DISPUTABLE_STATUSES = ['payment_verified', 'preparing', 'ready'];
export const canDispute = (order: { status: string }) =>
  DISPUTABLE_STATUSES.includes(order.status);
