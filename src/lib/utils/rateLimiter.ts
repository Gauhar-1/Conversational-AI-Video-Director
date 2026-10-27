/**
 * @file src/lib/utils/rateLimiter.ts
 * @description Rate Limiting Engine supporting Upstash Redis REST with resilient In-Memory Fallback.
 * Protects critical generation and enrichment endpoints against abuse and token exhaustion.
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

// In-Memory Fallback Store (Sliding Log / Fixed Window hybrid)
interface BucketEntry {
  count: number;
  resetAt: number;
}
const memoryBuckets = new Map<string, BucketEntry>();

// Periodic memory cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryBuckets.entries()) {
      if (bucket.resetAt <= now) {
        memoryBuckets.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks rate limit for a given identifier (userId, IP, or combined key).
 *
 * @param identifier Unique tracking key (e.g., `enrich:${userId}` or `video:${ip}`)
 * @param limit Maximum requests permitted in the window (default: 30)
 * @param windowSeconds Duration of the rate window in seconds (default: 60)
 * @returns RateLimitResult with success flag and quota stats
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Attempt Upstash Redis REST if credentials are provided
  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `ratelimit:${identifier}`;
      const now = Math.floor(Date.now() / 1000);

      // Multi/pipeline execution via Upstash REST: INCR + EXPIRE
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSeconds],
          ["TTL", redisKey],
        ]),
        cache: "no-store",
      });

      if (response.ok) {
        const results = await response.json();
        const count = results[0]?.result || 1;
        const ttl = results[2]?.result || windowSeconds;
        const reset = now + (ttl > 0 ? ttl : windowSeconds);

        return {
          success: count <= limit,
          limit,
          remaining: Math.max(0, limit - count),
          reset,
        };
      }
    } catch (redisErr) {
      console.warn("Upstash Redis rate limit check failed; using in-memory fallback:", redisErr);
    }
  }

  // 2. Resilient In-Memory Fallback
  const now = Date.now();
  const existing = memoryBuckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    memoryBuckets.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(resetAt / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const success = existing.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: Math.floor(existing.resetAt / 1000),
  };
}

/**
 * Returns standard HTTP RateLimit headers for responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
