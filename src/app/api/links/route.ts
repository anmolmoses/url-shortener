import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getKeyId } from '@/lib/auth';
import { checkRateLimit, rateLimitedResponse, applyRateLimitHeaders } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/links
 * List all links for the authenticated user.
 */
export const GET = withAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { slug: { contains: search, mode: 'insensitive' as const } },
          { url: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: { _count: { select: { clicks: true } } },
    }),
    prisma.link.count({ where }),
  ]);

  return NextResponse.json({
    links: links.map((link) => ({
      id: link.id,
      slug: link.slug,
      url: link.url,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${link.slug}`,
      clicks: link._count.clicks,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/links
 * Create a new short link. Rate limited: 100 requests/hour.
 */
export const POST = withAuth(async (request: NextRequest) => {
  const keyId = getKeyId(request);

  // Check rate limit
  const rl = await checkRateLimit(keyId, 'create_link', RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitedResponse(RATE_LIMIT, rl);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, slug: customSlug, expiresAt } = body;

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const slug = customSlug || nanoid(7);

  // Check for slug collision
  const existing = await prisma.link.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
  }

  const link = await prisma.link.create({
    data: {
      slug,
      url,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  const response = NextResponse.json(
    {
      id: link.id,
      slug: link.slug,
      url: link.url,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${link.slug}`,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    },
    { status: 201 }
  );

  applyRateLimitHeaders(response, RATE_LIMIT, rl);
  return response;
});
