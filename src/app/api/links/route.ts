import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSlug, validateAlias } from '@/lib/slug';
import { validateUrl } from '@/lib/url-validator';
import { requireApiKey } from '@/lib/auth';

const MAX_SLUG_RETRIES = 5;

/**
 * POST /api/links — Create a new short link.
 * Body: { url: string, alias?: string, expiresAt?: string }
 */
export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  let body: { url?: string; alias?: string; expiresAt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Validate URL
  if (!body.url) {
    return Response.json({ error: 'Missing required field: url' }, { status: 400 });
  }

  const urlCheck = validateUrl(body.url);
  if (!urlCheck.valid) {
    return Response.json({ error: urlCheck.error }, { status: 400 });
  }

  // Validate expiration
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      return Response.json({ error: 'Invalid expiresAt date.' }, { status: 400 });
    }
    if (expiresAt <= new Date()) {
      return Response.json({ error: 'expiresAt must be in the future.' }, { status: 400 });
    }
  }

  // Determine slug
  let slug: string;
  let customAlias = false;

  if (body.alias) {
    const aliasCheck = validateAlias(body.alias);
    if (!aliasCheck.valid) {
      return Response.json({ error: aliasCheck.error }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.link.findUnique({ where: { slug: body.alias } });
    if (existing) {
      return Response.json(
        { error: `Alias "${body.alias}" is already taken.` },
        { status: 409 }
      );
    }

    slug = body.alias;
    customAlias = true;
  } else {
    // Generate random slug with retry
    slug = '';
    for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
      const candidate = generateSlug();
      const existing = await prisma.link.findUnique({ where: { slug: candidate } });
      if (!existing) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return Response.json(
        { error: 'Failed to generate unique slug. Please try again.' },
        { status: 500 }
      );
    }
  }

  // Create link
  const link = await prisma.link.create({
    data: {
      slug,
      destinationUrl: urlCheck.normalized!,
      customAlias,
      expiresAt,
      apiKeyId: auth.key,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

  return Response.json(
    {
      id: link.id,
      shortUrl: `${baseUrl}/${link.slug}`,
      slug: link.slug,
      destinationUrl: link.destinationUrl,
      customAlias: link.customAlias,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    },
    { status: 201 }
  );
}

/**
 * GET /api/links — List links for the authenticated API key.
 * Query: ?page=1&limit=20&sort=createdAt|clicks&q=search
 */
export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const sort = searchParams.get('sort') === 'clicks' ? 'clickCount' : 'createdAt';
  const q = searchParams.get('q') || '';

  const where = {
    apiKeyId: auth.key,
    ...(q
      ? {
          OR: [
            { slug: { contains: q } },
            { destinationUrl: { contains: q } },
          ],
        }
      : {}),
  };

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { [sort]: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

  return Response.json({
    data: links.map((link) => ({
      id: link.id,
      shortUrl: `${baseUrl}/${link.slug}`,
      slug: link.slug,
      destinationUrl: link.destinationUrl,
      customAlias: link.customAlias,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
