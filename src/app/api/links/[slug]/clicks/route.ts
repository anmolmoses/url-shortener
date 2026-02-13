import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/links/[slug]/clicks
 * Get click analytics for a specific link.
 */
export const GET = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;
  const url = new URL(request.url);

  // Time range filter
  const range = url.searchParams.get('range') || '7d';
  const now = new Date();
  let since: Date;

  switch (range) {
    case '24h':
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      since = new Date(0);
      break;
    default:
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const clicks = await prisma.click.findMany({
    where: {
      linkId: link.id,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregate by referrer
  const referrers: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const timeSeries: Record<string, number> = {};

  for (const click of clicks) {
    // Referrers
    const ref = click.referrer || 'Direct';
    referrers[ref] = (referrers[ref] || 0) + 1;

    // Devices
    const device = click.device || 'Unknown';
    devices[device] = (devices[device] || 0) + 1;

    // Countries
    const country = click.country || 'Unknown';
    countries[country] = (countries[country] || 0) + 1;

    // Time series (daily buckets)
    const day = click.createdAt.toISOString().split('T')[0];
    timeSeries[day] = (timeSeries[day] || 0) + 1;
  }

  return NextResponse.json({
    slug: link.slug,
    totalClicks: clicks.length,
    range,
    timeSeries: Object.entries(timeSeries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, clicks: count })),
    referrers: Object.entries(referrers)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({ source, clicks: count })),
    devices: Object.entries(devices)
      .sort(([, a], [, b]) => b - a)
      .map(([device, count]) => ({ device, clicks: count })),
    countries: Object.entries(countries)
      .sort(([, a], [, b]) => b - a)
      .map(([country, count]) => ({ country, clicks: count })),
  });
});
