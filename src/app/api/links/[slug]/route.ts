import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * PATCH /api/links/[slug] — Update a link (auth required)
 */
export const PATCH = withAuth(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, expiresAt } = body;
  const data: any = {};
  if (url !== undefined) {
    try {
      new URL(url);
      data.url = url;
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
  }
  if (expiresAt !== undefined) {
    data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  const updated = await prisma.link.update({ where: { slug }, data });
  return NextResponse.json(updated);
});

/**
 * DELETE /api/links/[slug] — Delete a link (auth required)
 */
export const DELETE = withAuth(async (_request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  await prisma.link.delete({ where: { slug } });
  return NextResponse.json({ message: 'Link deleted' }, { status: 200 });
});
