import { NextResponse } from 'next/server';
import { redis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 * Key pattern: rl:{keyId}:{action}
 *
 * Fails open — if Redis is unavailable, requests are allowed.
 */
export async function checkRateLimit(
  keyId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = new Date(now + windowMs);

  try {
    const key = `rl:${keyId}:${action}`;

    // Use a pipeline: remove old entries, add current, count, set expiry
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) || 0;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetAt };
  } catch (error) {
    // Fail open — allow the request if Redis is down
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
 * Create a 429 response with retry-after header.
 */
export function rateLimitExceeded(limit: number, result: RateLimitResult): NextResponse {
  const retryAfterSecs = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  const response = NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfterSecs} seconds.`,
      retryAfter: retryAfterSecs,
    },
    { status: 429 }
  );
  response.headers.set('Retry-After', retryAfterSecs.toString());
  applyRateLimitHeaders(response, limit, result);
  return response;
}
