/**
 * @file src/lib/db/transaction.ts
 * @description Resilient MongoDB Transaction Wrapper with Standalone Replica-Set Fallback.
 * Ensures ACID guarantees on clustered MongoDB while preventing crashes on local standalone instances.
 */

import mongoose, { ClientSession } from "mongoose";
import dbConnect from "@/lib/db";

/**
 * Executes a callback within a MongoDB transaction if replica set transactions are supported.
 * Falls back gracefully to non-transactional execution if running on a standalone local MongoDB.
 *
 * @param callback Async function receiving an active ClientSession or null
 * @returns Result of the callback
 */
export async function withMongoTransaction<T>(
  callback: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  await dbConnect();

  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    // If sessions cannot be initialized at all, execute without session
    console.warn("MongoDB sessions unavailable; executing without session:", err);
    return await callback(null);
  }

  try {
    let result: T;
    let transactionCommitted = false;

    try {
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      transactionCommitted = true;
      return result!;
    } catch (txError: any) {
      // Check if error is due to standalone instance without replica set
      const isStandaloneError =
        txError.message?.includes("replica set") ||
        txError.message?.includes("Transaction numbers are only allowed on a replica set member") ||
        txError.codeName === "IllegalOperation";

      if (isStandaloneError) {
        console.warn("MongoDB standalone detected. Falling back to non-transactional execution.");
        return await callback(null);
      }

      throw txError;
    }
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}
