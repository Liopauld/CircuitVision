import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTransition,
  drawDownStock,
  finalizeStockStatus,
  resolveDisputeOutcome,
} from '../src/lib/orderLifecycle.js';

test('evaluateTransition: happy paths through the lifecycle', () => {
  assert.deepEqual(evaluateTransition('awaiting_payment', 'buyer', 'submit_payment'), {
    ok: true,
    to: 'payment_submitted',
  });
  assert.deepEqual(evaluateTransition('payment_submitted', 'seller', 'verify_payment'), {
    ok: true,
    to: 'payment_verified',
  });
  assert.deepEqual(evaluateTransition('ready', 'buyer', 'complete'), {
    ok: true,
    to: 'completed',
  });
  // admin may act on seller/buyer steps
  assert.equal(evaluateTransition('payment_submitted', 'admin', 'verify_payment').ok, true);
});

test('evaluateTransition: rejects unknown action', () => {
  const r = evaluateTransition('ready', 'buyer', 'teleport');
  assert.equal(r.ok, false);
  assert.equal(r.code, 400);
});

test('evaluateTransition: rejects non-participant (null actor)', () => {
  const r = evaluateTransition('ready', null, 'complete');
  assert.equal(r.ok, false);
  assert.equal(r.code, 403);
});

test('evaluateTransition: rejects wrong actor', () => {
  // only the buyer/admin may complete
  const r = evaluateTransition('ready', 'seller', 'complete');
  assert.equal(r.ok, false);
  assert.equal(r.code, 403);
});

test('evaluateTransition: rejects wrong source status', () => {
  // cannot verify payment that was never submitted
  const r = evaluateTransition('awaiting_payment', 'seller', 'verify_payment');
  assert.equal(r.ok, false);
  assert.equal(r.code, 409);
});

test('drawDownStock: stays available while units remain', () => {
  assert.deepEqual(drawDownStock(10, 3), { quantity: 7, status: 'available' });
});

test('drawDownStock: flips to reserved when the last unit is taken', () => {
  assert.deepEqual(drawDownStock(2, 2), { quantity: 0, status: 'reserved' });
});

test('finalizeStockStatus: sold only when exhausted', () => {
  assert.equal(finalizeStockStatus(0), 'sold');
  assert.equal(finalizeStockStatus(4), 'available');
});

test('resolveDisputeOutcome: full refund cancels and restocks', () => {
  const o = resolveDisputeOutcome(500, 'refund');
  assert.deepEqual(o, {
    ok: true,
    refundToBuyer: 500,
    toSeller: 0,
    orderStatus: 'cancelled',
    listingStatus: 'available',
    restock: true,
  });
});

test('resolveDisputeOutcome: partial splits the escrow', () => {
  const o = resolveDisputeOutcome(500, 'partial', 200);
  assert.equal(o.ok, true);
  assert.equal(o.refundToBuyer, 200);
  assert.equal(o.toSeller, 300);
  assert.equal(o.orderStatus, 'completed');
  assert.equal(o.restock, false);
});

test('resolveDisputeOutcome: partial rejects out-of-range amounts', () => {
  assert.equal(resolveDisputeOutcome(500, 'partial', 0).ok, false);
  assert.equal(resolveDisputeOutcome(500, 'partial', 500).ok, false);
  assert.equal(resolveDisputeOutcome(500, 'partial', 600).ok, false);
  assert.equal(resolveDisputeOutcome(500, 'partial', 'abc').ok, false);
});

test('resolveDisputeOutcome: release/none give the seller everything', () => {
  for (const res of ['release', 'none']) {
    const o = resolveDisputeOutcome(500, res);
    assert.equal(o.refundToBuyer, 0);
    assert.equal(o.toSeller, 500);
    assert.equal(o.orderStatus, 'completed');
    assert.equal(o.listingStatus, 'sold');
  }
});
