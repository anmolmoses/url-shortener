import { cacheLink, invalidateLink } from './cache';

/**
 * Call after creating a new link to warm the Redis cache.
 * Best-effort — cache failures don't break link creation.
 */
export async function onLinkCreated(
  slug: string,
  url: string,
  linkId: string
): Promise<void> {
  try {
    await cacheLink(slug, url, 3600, linkId);
  } catch (err) {
    console.error('[cache-hooks] failed to cache new link:', err);
  }
}

/**
 * Call after updating a link to invalidate stale cache.
 */
export async function onLinkUpdated(slug: string): Promise<void> {
  try {
    await invalidateLink(slug);
  } catch (err) {
    console.error('[cache-hooks] failed to invalidate updated link:', err);
  }
}

/**
 * Call after deleting a link to remove from cache.
 */
export async function onLinkDeleted(slug: string): Promise<void> {
  try {
    await invalidateLink(slug);
  } catch (err) {
    console.error('[cache-hooks] failed to invalidate deleted link:', err);
  }
}
