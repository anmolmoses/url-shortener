import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { getClickSummary, getTimeSeries, getOverview, Granularity } from './analytics.queries.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify that the given link belongs to the requesting user.
 * Returns the link if owned, or sends a 404 and returns null.
 */
async function verifyLinkOwnership(
  linkId: string,
  userId: string,
  reply: FastifyReply
): Promise<boolean> {
  const link = await prisma.link.findFirst({
    where: { id: linkId, userId },
    select: { id: true },
  });

  if (!link) {
    reply.status(404).send({ error: 'Link not found' });
    return false;
  }
  return true;
}

interface DateRangeQuery {
  from?: string;
  to?: string;
}

interface TimeSeriesQuery extends DateRangeQuery {
  granularity?: string;
}

interface LinkIdParams {
  id: string;
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('preHandler', requireAuth);

  /**
   * GET /api/links/:id/analytics/summary
   * Returns aggregated click analytics for a single link.
   */
  app.get<{ Params: LinkIdParams; Querystring: DateRangeQuery }>(
    '/api/links/:id/analytics/summary',
    async (request, reply) => {
      const { id } = request.params;
      const { from, to } = request.query;
      const userId = (request as any).userId;

      const owned = await verifyLinkOwnership(id, userId, reply);
      if (!owned) return;

      const summary = await getClickSummary(id, from, to);
      return summary;
    }
  );

  /**
   * GET /api/links/:id/analytics/timeseries
   * Returns time-bucketed click data for charting.
   */
  app.get<{ Params: LinkIdParams; Querystring: TimeSeriesQuery }>(
    '/api/links/:id/analytics/timeseries',
    async (request, reply) => {
      const { id } = request.params;
      const { from, to, granularity } = request.query;
      const userId = (request as any).userId;

      const owned = await verifyLinkOwnership(id, userId, reply);
      if (!owned) return;

      // Validate granularity
      const validGranularities: Granularity[] = ['hour', 'day', 'week'];
      const gran: Granularity = validGranularities.includes(granularity as Granularity)
        ? (granularity as Granularity)
        : 'day';

      const timeseries = await getTimeSeries(id, from, to, gran);
      return timeseries;
    }
  );

  /**
   * GET /api/analytics/overview
   * Aggregate analytics across all of the authenticated user's links.
   * Powers the dashboard home page.
   */
  app.get<{ Querystring: DateRangeQuery }>(
    '/api/analytics/overview',
    async (request, reply) => {
      const { from, to } = request.query;
      const userId = (request as any).userId;

      const overview = await getOverview(userId, from, to);
      return overview;
    }
  );
}

export default analyticsRoutes;
