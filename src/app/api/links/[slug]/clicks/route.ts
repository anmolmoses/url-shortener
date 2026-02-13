import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/links/[slug]/clicks — Get click analytics (auth required)
 */
export const GET = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const clicks = await prisma.click.findMany({
    where: { linkId: link.id, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    slug,
    totalClicks: clicks.length,
    period: `${days}d`,
    clicks,
  });
});
