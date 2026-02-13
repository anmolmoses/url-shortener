/**
 * Cache integration hooks for dev-1's API routes.
 *
 * After creating a link → call onLinkCreated(slug, url, linkId)
 * After updating a link → call onLinkUpdated(slug, newUrl?, newLinkId?)
 * After deleting a link → call onLinkDeleted(slug)
 */
import { cacheLink, invalidateLink } from './cache';

/**
 * Call after a new link is created to warm the cache.
 */
export async function onLinkCreated(
  slug: string,
  destinationUrl: string,
  linkId: string
): Promise<void> {
  await cacheLink(slug, destinationUrl, linkId);
}

/**
 * Call after a link is updated to invalidate stale cache.
 * Optionally re-caches with new values.
 */
export async function onLinkUpdated(
  slug: string,
  destinationUrl?: string,
  linkId?: string
): Promise<void> {
  if (destinationUrl && linkId) {
    // Re-cache with updated values
    await cacheLink(slug, destinationUrl, linkId);
  } else {
    // Just invalidate — next request will re-populate
    await invalidateLink(slug);
  }
}

/**
 * Call after a link is deleted to remove from cache.
 */
export async function onLinkDeleted(slug: string): Promise<void> {
  await invalidateLink(slug);
}
