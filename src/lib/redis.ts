import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Returns a singleton Redis client connected to REDIS_URL.
 * Defaults to localhost:6379 if REDIS_URL is not set.
 */
export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('error', (err) => {
      console.error('[redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[redis] Connected');
    });
  }

  return redis;
}

/**
 * Gracefully disconnect Redis (for shutdown hooks).
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
