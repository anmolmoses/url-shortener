import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  createLinkSchema,
  updateLinkSchema,
  listLinksQuerySchema,
  CreateLinkInput,
  UpdateLinkInput,
} from './links.validation.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function linkRoutes(app: FastifyInstance) {
  // All routes in this plugin require auth
  app.addHook('onRequest', requireAuth);

  // POST /api/links — Create a short link
  app.post('/api/links', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = createLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { url, alias, expiresAt } = parsed.data;
    const userId = (req as any).userId as string;
    const slug = alias ?? nanoid(7);

    // Check uniqueness
    const existing = await prisma.link.findUnique({ where: { slug } });
    if (existing) {
      return reply.status(409).send({ error: 'Alias already taken' });
    }

    const link = await prisma.link.create({
      data: {
        slug,
        destinationUrl: url,
        userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return reply.status(201).send({
      id: link.id,
      slug: link.slug,
      shortUrl: `${BASE_URL}/${link.slug}`,
      destinationUrl: link.destinationUrl,
      createdAt: link.createdAt,
    });
  });

  // GET /api/links — List user's links
  app.get('/api/links', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = listLinksQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, search } = parsed.data;
    const userId = (req as any).userId as string;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: 'insensitive' } },
        { destinationUrl: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { clickEvents: true } },
        },
      }),
      prisma.link.count({ where }),
    ]);

    const data = links.map((link) => ({
      id: link.id,
      slug: link.slug,
      shortUrl: `${BASE_URL}/${link.slug}`,
      destinationUrl: link.destinationUrl,
      clickCount: link._count.clickEvents,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    }));

    return reply.send({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // GET /api/links/:id — Single link detail
  app.get('/api/links/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const link = await prisma.link.findUnique({
      where: { id },
      include: { _count: { select: { clickEvents: true } } },
    });

    if (!link || link.userId !== userId) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    return reply.send({
      id: link.id,
      slug: link.slug,
      shortUrl: `${BASE_URL}/${link.slug}`,
      destinationUrl: link.destinationUrl,
      clickCount: link._count.clickEvents,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    });
  });

  // PATCH /api/links/:id — Update link
  app.patch('/api/links/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const parsed = updateLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const link = await prisma.link.findUnique({ where: { id } });
    if (!link || link.userId !== userId) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    const updateData: any = {};
    if (parsed.data.destinationUrl !== undefined) {
      updateData.destinationUrl = parsed.data.destinationUrl;
    }
    if (parsed.data.expiresAt !== undefined) {
      updateData.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    }

    const updated = await prisma.link.update({
      where: { id },
      data: updateData,
    });

    return reply.send({
      id: updated.id,
      slug: updated.slug,
      shortUrl: `${BASE_URL}/${updated.slug}`,
      destinationUrl: updated.destinationUrl,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });

  // DELETE /api/links/:id — Delete link
  app.delete('/api/links/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const link = await prisma.link.findUnique({ where: { id } });
    if (!link || link.userId !== userId) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    await prisma.link.delete({ where: { id } });

    return reply.status(204).send();
  });
}
