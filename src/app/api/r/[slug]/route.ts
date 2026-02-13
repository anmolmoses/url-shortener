import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { links } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCachedLink, getCachedLinkId, cacheLink } from '@/lib/cache';
import { recordClick } from '@/lib/analytics';

/**
 * Fire analytics in a fire-and-forget manner.
 * Resolves the linkId from cache or DB, then records the click.
 */
async function fireAnalytics(
  slug: string,
  linkId: string | null,
  request: NextRequest
): Promise<void> {
  try {
    let resolvedId = linkId;

    // If we don't have the linkId (cache hit path), check the linkid cache
    if (!resolvedId) {
      resolvedId = await getCachedLinkId(slug);
    }

    // If still no linkId, look it up from DB
    if (!resolvedId) {
      const link = await db
        .select({ id: links.id })
        .from(links)
        .where(eq(links.slug, slug))
        .limit(1);
      resolvedId = link[0]?.id ?? null;
    }

    if (resolvedId) {
      await recordClick(resolvedId, request);
    }
  } catch (err) {
    console.error('[redirect] analytics error:', err);
  }
}

/**
 * GET /api/r/[slug]
 *
 * Redirect handler. Checks Redis cache first, falls back to Postgres.
 * Fires analytics asynchronously to avoid blocking the redirect.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // 1. Check Redis cache
  const cachedUrl = await getCachedLink(slug);
  if (cachedUrl) {
    // Fire analytics without blocking the response
    fireAnalytics(slug, null, request).catch(() => {});
    return NextResponse.redirect(cachedUrl, 302);
  }

  // 2. Cache miss — query Postgres
  const result = await db
    .select()
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1);

  const link = result[0];

  // 3. Slug not found → 404
  if (!link) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 4. Check expiration → 410 Gone
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return new NextResponse('Gone — this link has expired', { status: 410 });
  }

  // 5. Cache in Redis for next request (1hr TTL)
  cacheLink(slug, link.url, 3600, link.id).catch(() => {});

  // 6. Fire analytics without blocking
  fireAnalytics(slug, link.id, request).catch(() => {});

  // 7. Redirect
  return NextResponse.redirect(link.url, 302);
}
