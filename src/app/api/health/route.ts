import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pingRedis } from '@/lib/redis';

const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint — no auth required.
 * Checks Postgres and Redis connectivity.
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
    redisOk = await pingRedis();
  } catch (error) {
    console.error('[health] Redis check failed:', error);
  }

  const status = postgresOk && redisOk ? 'ok' : 'degraded';
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status,
      postgres: postgresOk,
      redis: redisOk,
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
    },
    { status: status === 'ok' ? 200 : 503 }
  );
}
