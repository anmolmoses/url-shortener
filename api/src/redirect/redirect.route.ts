import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { recordClick } from './click.recorder.js';

/**
 * Top-level redirect route. Must be registered BEFORE /api/* routes.
 * No auth middleware — this is the hot path.
 */
export async function redirectRoute(app: FastifyInstance) {
  app.get('/:slug', async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };

    // Skip anything that looks like an API or static path
    if (slug === 'api' || slug === 'health' || slug === 'favicon.ico') {
      return reply.callNotFound();
    }

    const link = await prisma.link.findUnique({
      where: { slug },
      select: { id: true, destinationUrl: true, expiresAt: true },
    });

    if (!link) {
      return reply.status(404).send({ error: 'Short link not found' });
    }

    // Check expiry
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return reply.status(410).send({ error: 'This link has expired' });
    }

    // Fire-and-forget click recording
    recordClick(link.id, req);

    // 301 permanent redirect
    return reply.redirect(301, link.destinationUrl);
  });
}
