import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { env } from '../lib/env';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

interface JwtPayload {
  userId: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    request.userId = decoded.userId;
  } catch {
    reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
