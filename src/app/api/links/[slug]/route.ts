import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/links/[slug]
 * Get link details by slug.
 */
export const GET = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  const link = await prisma.link.findUnique({
    where: { slug },
    include: { _count: { select: { clicks: true } } },
  });

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: link.id,
    slug: link.slug,
    url: link.url,
    shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${link.slug}`,
    clicks: link._count.clicks,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  });
});

/**
 * PATCH /api/links/[slug]
 * Update a link's URL or expiration.
 */
export const PATCH = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const updateData: any = {};
  if (body.url !== undefined) {
    try {
      new URL(body.url);
      updateData.url = body.url;
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
  }
  if (body.expiresAt !== undefined) {
    updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  const updated = await prisma.link.update({
    where: { slug },
    data: updateData,
  });

  return NextResponse.json({
    id: updated.id,
    slug: updated.slug,
    url: updated.url,
    shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${updated.slug}`,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

/**
 * DELETE /api/links/[slug]
 * Delete a link and all its click data.
 */
export const DELETE = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  await prisma.link.delete({ where: { slug } });

  return NextResponse.json({ message: 'Link deleted successfully' });
});
