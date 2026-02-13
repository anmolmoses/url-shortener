import { getRedis } from './redis';

const PREFIX = 'link:';
const LINKID_PREFIX = 'linkid:';
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Cache a shortened link's destination URL in Redis.
 * Optionally stores the linkId for analytics lookups.
 */
export async function cacheLink(
  slug: string,
  url: string,
  ttl: number = DEFAULT_TTL,
  linkId?: string
): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(PREFIX + slug, url, 'EX', ttl);
  if (linkId) {
    pipeline.set(LINKID_PREFIX + slug, linkId, 'EX', ttl);
  }
  await pipeline.exec();
}

/**
 * Retrieve a cached destination URL by slug.
 * Returns null on cache miss.
 */
export async function getCachedLink(slug: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(PREFIX + slug);
}

/**
 * Retrieve the cached linkId for a slug (used by analytics).
 */
export async function getCachedLinkId(slug: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(LINKID_PREFIX + slug);
}

/**
 * Invalidate a cached link (on update or delete).
 */
export async function invalidateLink(slug: string): Promise<void> {
  const redis = getRedis();
  await redis.del(PREFIX + slug, LINKID_PREFIX + slug);
}
