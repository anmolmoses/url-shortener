/**
 * Cache integration hooks for link CRUD operations.
 * Import and call these from the links API route (dev-1's route.ts)
 * after create/update/delete operations.
 */
import { cacheLink, invalidateLink } from '@/lib/cache';

/**
 * Call after a new link is created to pre-warm the cache.
 */
export async function onLinkCreated(slug: string, url: string): Promise<void> {
  try {
    await cacheLink(slug, url);
  } catch (error) {
    // Cache warming is best-effort; don't fail the API response
    console.error('[Cache] Failed to cache new link:', error);
  }
}

/**
 * Call after a link is updated to invalidate stale cache.
 */
export async function onLinkUpdated(slug: string, newUrl?: string): Promise<void> {
  try {
    // Invalidate old cache entry
    await invalidateLink(slug);

    // If new URL provided, re-cache immediately
    if (newUrl) {
      await cacheLink(slug, newUrl);
    }
  } catch (error) {
    console.error('[Cache] Failed to invalidate updated link:', error);
  }
}

/**
 * Call after a link is deleted to remove from cache.
 */
export async function onLinkDeleted(slug: string): Promise<void> {
  try {
    await invalidateLink(slug);

    // Also clean up the linkId mapping
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    await redis.del(`linkid:${slug}`);
  } catch (error) {
    console.error('[Cache] Failed to invalidate deleted link:', error);
  }
}
