import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkRateLimit, applyRateLimitHeaders, rateLimitExceeded } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/links — List all links (auth required)
 */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const search = searchParams.get('search') || '';

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
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { clicks: true } } },
    }),
    prisma.link.count({ where }),
  ]);

  return NextResponse.json({
    links: links.map((link) => ({
      ...link,
      clicks: link._count.clicks,
      _count: undefined,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/links — Create a short link (auth + rate limit)
 */
export const POST = withAuth(async (request: NextRequest) => {
  const keyId = request.headers.get('x-key-id') || 'unknown';

  // Rate limit check
  const rl = await checkRateLimit(keyId, 'create-link', RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitExceeded(RATE_LIMIT, rl);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, slug: customSlug, expiresAt } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

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
      url,
      slug,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const response = NextResponse.json(
    {
      ...link,
      shortUrl: `${baseUrl}/${link.slug}`,
    },
    { status: 201 }
  );

  return applyRateLimitHeaders(response, RATE_LIMIT, rl);
});
