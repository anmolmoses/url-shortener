import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiKey } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/links/[slug]/clicks — Paginated click events.
 * Query: ?page=1&limit=50&from=ISO&to=ISO
 * Accept: text/csv returns CSV download.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  const { slug } = await params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link || link.apiKeyId !== auth.key) {
    return Response.json({ error: 'Link not found.' }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = { linkId: link.id };

  if (from || to) {
    where.timestamp = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        (where.timestamp as Record<string, Date>).gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        (where.timestamp as Record<string, Date>).lte = toDate;
      }
    }
  }

  const accept = request.headers.get('accept') || '';
  const wantsCsv = accept.includes('text/csv');

  if (wantsCsv) {
    // Fetch all matching clicks for CSV export (capped at 10k)
    const clicks = await prisma.click.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10000,
    });

    const header = 'id,timestamp,ip,userAgent,referrer,country,deviceType';
    const rows = clicks.map(
      (c) =>
        `${c.id},${c.timestamp.toISOString()},${escapeCsv(c.ip)},${escapeCsv(c.userAgent)},${escapeCsv(c.referrer || '')},${c.country || ''},${c.deviceType}`
    );
    const csv = [header, ...rows].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clicks-${slug}.csv"`,
      },
    });
  }

  const [clicks, total] = await Promise.all([
    prisma.click.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.click.count({ where }),
  ]);

  return Response.json({
    data: clicks.map((c) => ({
      id: c.id,
      timestamp: c.timestamp,
      ip: c.ip,
      userAgent: c.userAgent,
      referrer: c.referrer,
      country: c.country,
      deviceType: c.deviceType,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/** Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines). */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
