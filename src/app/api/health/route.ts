import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint — no auth required.
 * Returns status of Postgres and Redis connections.
 */
export async function GET() {
  let postgresOk = false;
  let redisOk = false;

  // Check Postgres
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgresOk = true;
  } catch (error) {
    console.error('[health] Postgres check failed:', error);
  }

  // Check Redis
  try {
    const pong = await redis.ping();
    redisOk = pong === 'PONG';
  } catch (error) {
    console.error('[health] Redis check failed:', error);
  }

  const status = postgresOk && redisOk ? 'ok' : 'degraded';
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const body = {
    status,
    postgres: postgresOk,
    redis: redisOk,
    uptime: uptimeSeconds,
  };

  return NextResponse.json(body, {
    status: status === 'ok' ? 200 : 503,
  });
}
