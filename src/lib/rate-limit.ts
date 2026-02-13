import { NextResponse } from 'next/server';
import { redis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 *
 * Key pattern: rl:{keyId}:{action}
 * Each request is stored as a member with score = timestamp.
 * On each check, expired entries are pruned.
 */
export async function checkRateLimit(
  keyId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `rl:${keyId}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = new Date(now + windowMs);

  try {
    // Use a pipeline: remove old entries, add current, count, set expiry
    const pipeline = redis.multi();

    // Remove entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request with unique member (timestamp + random)
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    pipeline.zadd(key, { score: now, member });

    // Count entries in the window
    pipeline.zcard(key);

    // Set expiry on the key to auto-cleanup
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    // zcard result is the 3rd command (index 2)
    const count = (results?.[2] as number) || 0;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    if (!allowed) {
      // Remove the entry we just added since request is denied
      await redis.zrem(key, member);
    }

    return { allowed, remaining, resetAt };
  } catch (error) {
    // If Redis is down, allow the request (fail open)
    console.error('[rate-limit] Redis error, failing open:', error);
    return { allowed: true, remaining: limit, resetAt };
  }
}

/**
 * Apply rate limit headers to a response.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  limit: number,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000).toString());
  return response;
}

/**
 * Generate a 429 Too Many Requests response.
 */
export function rateLimitedResponse(limit: number, result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  const response = NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
    },
    { status: 429 }
  );

  response.headers.set('Retry-After', retryAfterSeconds.toString());
  applyRateLimitHeaders(response, limit, result);
  return response;
}
