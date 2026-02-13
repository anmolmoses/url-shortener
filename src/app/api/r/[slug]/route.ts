import { NextRequest, NextResponse } from 'next/server';
import { getCachedLink, cacheLink } from '@/lib/cache';
import { recordClick } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/r/[slug]
 *
 * The redirect handler. Called via Edge middleware rewrite.
 * Runs in Node.js runtime for full Redis + Prisma access.
 *
 * Flow:
 * 1. Check Redis cache for slug → URL mapping
 * 2. On cache miss, query Postgres
 * 3. If found, check expiration
 * 4. Cache the result in Redis (1hr TTL)
 * 5. Fire analytics recording (fire-and-forget)
 * 6. Return 302 redirect
 *
 * Error cases:
 * - Slug not found → 404
 * - Link expired → 410 Gone
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Try Redis cache first (fast path — should be < 5ms)
  const cached = await getCachedLink(slug);

  if (cached) {
    // Cache hit — fire analytics and redirect immediately
    // Fire-and-forget: don't await, catch silently
    if (cached.linkId) {
      recordClick(cached.linkId, request).catch(() => {});
    }

    return NextResponse.redirect(cached.url, 302);
  }

  // 2. Cache miss — query Postgres
  const link = await prisma.link.findUnique({
    where: { slug },
    select: {
      id: true,
      destinationUrl: true,
      expiresAt: true,
    },
  });

  // 3. Not found → 404
  if (!link) {
    return new NextResponse(
      JSON.stringify({
        error: 'Not Found',
        message: `No link found for slug: ${slug}`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Check expiration → 410 Gone
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return new NextResponse(
      JSON.stringify({
        error: 'Gone',
        message: 'This link has expired.',
      }),
      {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Cache in Redis for next request (1hr TTL)
  cacheLink(slug, link.destinationUrl, link.id).catch((err) => {
    console.error('[redirect] Failed to cache link:', err);
  });

  // 6. Fire analytics (fire-and-forget)
  recordClick(link.id, request).catch(() => {});

  // 7. Redirect
  return NextResponse.redirect(link.destinationUrl, 302);
}

export const runtime = 'nodejs';
