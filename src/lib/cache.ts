import { getRedis } from './redis';

const CACHE_PREFIX = 'link:';
const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Cache a link's destination URL in Redis.
 * @param slug - The short link slug
 * @param url - The destination URL
 * @param ttl - Time-to-live in seconds (default: 1 hour)
 */
export async function cacheLink(
  slug: string,
  url: string,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const redis = getRedis();
  const key = `${CACHE_PREFIX}${slug}`;

  if (ttl > 0) {
    await redis.set(key, url, 'EX', ttl);
  } else {
    await redis.set(key, url);
  }
}

/**
 * Retrieve a cached destination URL by slug.
 * Returns null on cache miss.
 */
export async function getCachedLink(slug: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`${CACHE_PREFIX}${slug}`);
}

/**
 * Invalidate (delete) a cached link.
 * Call after link update or deletion.
 */
export async function invalidateLink(slug: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${CACHE_PREFIX}${slug}`);
}
