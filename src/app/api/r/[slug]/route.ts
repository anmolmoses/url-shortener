import { NextRequest, NextResponse } from 'next/server';
import { getCachedLink, cacheLink } from '@/lib/cache';
import { recordClick } from '@/lib/analytics';
import { db } from '@/db';
import { links } from '@/db/schema';
import { eq } from 'drizzle-orm';

const CACHE_TTL = 3600; // 1 hour

/**
 * Redirect route handler.
 *
 * Flow:
 * 1. Check Redis cache for slug → destination URL
 * 2. On cache miss, query Postgres
 * 3. If found, cache in Redis with 1hr TTL
 * 4. Return 302 redirect
 * 5. Fire recordClick() as fire-and-forget (no await)
 * 6. 410 Gone for expired links
 * 7. 404 for unknown slugs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Check Redis cache first (fast path)
  const cachedUrl = await getCachedLink(slug);

  if (cachedUrl) {
    // Fire analytics async — don't block redirect
    // We need the linkId for analytics; store it in a secondary cache key
    fireAnalytics(slug, request);
    return NextResponse.redirect(cachedUrl, 302);
  }

  // 2. Cache miss — query Postgres
  const link = await db
    .select()
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  // 5. Not found
  if (!link) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 6. Expired link
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return new NextResponse('Gone — this link has expired', { status: 410 });
  }

  // 3. Cache the link for subsequent requests
  await cacheLink(slug, link.url, CACHE_TTL);

  // Also cache the linkId mapping for analytics on cache hits
  const { getRedis } = await import('@/lib/redis');
  const redis = getRedis();
  await redis.set(`linkid:${slug}`, link.id, 'EX', CACHE_TTL);

  // 4. Fire analytics async — don't block redirect
  recordClick(link.id, request).catch(() => {});

  return NextResponse.redirect(link.url, 302);
}

/**
 * Fire analytics for cached redirects.
 * Looks up the linkId from a secondary Redis key, then records the click.
 */
async function fireAnalytics(slug: string, request: NextRequest): Promise<void> {
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    let linkId = await redis.get(`linkid:${slug}`);

    // If linkId not cached, look it up from Postgres
    if (!linkId) {
      const link = await db
        .select({ id: links.id })
        .from(links)
        .where(eq(links.slug, slug))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!link) return;
      linkId = link.id;

      // Cache for next time
      await redis.set(`linkid:${slug}`, linkId, 'EX', 3600);
    }

    await recordClick(linkId, request);
  } catch (error) {
    console.error('[Redirect] Analytics fire-and-forget error:', error);
  }
}
