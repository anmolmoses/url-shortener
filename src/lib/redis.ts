import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Redis client singleton.
 * Connects to REDIS_URL env var (defaults to localhost:6379).
 */
export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
    });

    redis.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[redis] connected');
    });
  }
  return redis;
}

/**
 * Graceful shutdown helper.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
