import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiKey } from '@/lib/auth';
import { validateUrl } from '@/lib/url-validator';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/links/[slug] — Link details with aggregated stats.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  const { slug } = await params;

  const link = await prisma.link.findUnique({
    where: { slug },
  });

  if (!link || link.apiKeyId !== auth.key) {
    return Response.json({ error: 'Link not found.' }, { status: 404 });
  }

  // Aggregate stats
  const [deviceStats, referrerStats, countryStats] = await Promise.all([
    prisma.click.groupBy({
      by: ['deviceType'],
      where: { linkId: link.id },
      _count: { id: true },
    }),
    prisma.click.groupBy({
      by: ['referrer'],
      where: { linkId: link.id },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.click.groupBy({
      by: ['country'],
      where: { linkId: link.id },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

  return Response.json({
    id: link.id,
    shortUrl: `${baseUrl}/${link.slug}`,
    slug: link.slug,
    destinationUrl: link.destinationUrl,
    customAlias: link.customAlias,
    clickCount: link.clickCount,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    stats: {
      devices: deviceStats.map((d) => ({ type: d.deviceType, count: d._count.id })),
      referrers: referrerStats.map((r) => ({ referrer: r.referrer || '(direct)', count: r._count.id })),
      countries: countryStats.map((c) => ({ country: c.country || 'Unknown', count: c._count.id })),
    },
  });
}

/**
 * PATCH /api/links/[slug] — Update destinationUrl or expiresAt.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  const { slug } = await params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link || link.apiKeyId !== auth.key) {
    return Response.json({ error: 'Link not found.' }, { status: 404 });
  }

  let body: { destinationUrl?: string; expiresAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const data: { destinationUrl?: string; expiresAt?: Date | null } = {};

  if (body.destinationUrl !== undefined) {
    const urlCheck = validateUrl(body.destinationUrl);
    if (!urlCheck.valid) {
      return Response.json({ error: urlCheck.error }, { status: 400 });
    }
    data.destinationUrl = urlCheck.normalized!;
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      data.expiresAt = null;
    } else {
      const d = new Date(body.expiresAt);
      if (isNaN(d.getTime())) {
        return Response.json({ error: 'Invalid expiresAt date.' }, { status: 400 });
      }
      if (d <= new Date()) {
        return Response.json({ error: 'expiresAt must be in the future.' }, { status: 400 });
      }
      data.expiresAt = d;
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const updated = await prisma.link.update({
    where: { slug },
    data,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

  return Response.json({
    id: updated.id,
    shortUrl: `${baseUrl}/${updated.slug}`,
    slug: updated.slug,
    destinationUrl: updated.destinationUrl,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
  });
}

/**
 * DELETE /api/links/[slug] — Delete link and cascade clicks.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  const { slug } = await params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link || link.apiKeyId !== auth.key) {
    return Response.json({ error: 'Link not found.' }, { status: 404 });
  }

  // Cascade delete handled by Prisma relation onDelete: Cascade
  await prisma.link.delete({ where: { slug } });

  return Response.json({ message: 'Link deleted successfully.' });
}
