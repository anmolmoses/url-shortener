import { getRedis } from './redis';

const PREFIX = 'link:';
const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Cache a link slug → destination URL in Redis.
 * Also stores the linkId for analytics lookups.
 */
export async function cacheLink(
  slug: string,
  url: string,
  linkId?: string,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();

  pipeline.set(`${PREFIX}${slug}`, url, 'EX', ttl);

  if (linkId) {
    pipeline.set(`${PREFIX}${slug}:id`, linkId, 'EX', ttl);
  }

  await pipeline.exec();
}

/**
 * Get a cached destination URL for a slug.
 * Returns null on cache miss.
 */
export async function getCachedLink(
  slug: string
): Promise<{ url: string; linkId: string | null } | null> {
  const redis = getRedis();
  const [url, linkId] = await redis.mget(
    `${PREFIX}${slug}`,
    `${PREFIX}${slug}:id`
  );

  if (!url) return null;

  return { url, linkId };
}

/**
 * Invalidate (delete) cached data for a slug.
 */
export async function invalidateLink(slug: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${PREFIX}${slug}`, `${PREFIX}${slug}:id`);
}
