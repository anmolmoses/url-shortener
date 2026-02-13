import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { redirectRoute } from './redirect/redirect.route.js';
import { linkRoutes } from './links/links.routes.js';
import { authRoutes } from './auth/auth.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    trustProxy: true,
  });

  // CORS
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    global: false, // Don't apply globally — we target specific routes
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // --- Redirect route FIRST (hot path, no auth) ---
  await app.register(redirectRoute);

  // --- API routes ---
  // Rate limit on link creation: 100 req/hr
  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url === '/api/links' && routeOptions.method === 'POST') {
      const existing = routeOptions.preHandler;
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 100,
          timeWindow: '1 hour',
        },
      };
    }
  });

  await app.register(authRoutes);
  await app.register(linkRoutes);

  return app;
}

// Start server if run directly
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

buildApp()
  .then((app) => app.listen({ port: PORT, host: HOST }))
  .then((address) => console.log(`Server listening on ${address}`))
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
