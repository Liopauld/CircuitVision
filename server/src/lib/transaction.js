import mongoose from 'mongoose';

// Multi-document transactions require a replica set / mongos. Local dev often
// runs a standalone mongod, which rejects them. We detect that once and fall
// back to running the work without a session (same behaviour as before
// transactions were introduced) so the app still works everywhere.
let transactionsSupported = null; // null = unknown, true/false once learned

function isUnsupportedTransactionError(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 20 || // IllegalOperation (standalone)
    err?.codeName === 'IllegalOperation' ||
    /Transaction numbers are only allowed on a replica set member or mongos/i.test(msg) ||
    /transactions are not supported/i.test(msg) ||
    /replica set/i.test(msg)
  );
}

/**
 * Run `work(session)` inside a MongoDB transaction when the deployment supports
 * one, otherwise run `work(null)` with no session. `work` must be idempotent: on
 * a replica set it may be retried, so it should (re)load any documents it writes
 * using the provided session rather than closing over docs read earlier.
 *
 * @param {(session: import('mongoose').ClientSession | null) => Promise<T>} work
 * @returns {Promise<T>}
 * @template T
 */
export async function runInTransaction(work) {
  if (transactionsSupported === false) return work(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    transactionsSupported = true;
    return result;
  } catch (err) {
    if (isUnsupportedTransactionError(err)) {
      transactionsSupported = false;
      return work(null); // fall back: no transaction on standalone mongod
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
}
