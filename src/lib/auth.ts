import { NextRequest, NextResponse } from 'next/server';

export interface AuthResult {
  valid: boolean;
  keyId: string;
}

/**
 * Validate an API key from the X-API-Key header.
 * MVP: compares against API_KEYS env var (comma-separated list).
 */
export function validateApiKey(request: NextRequest): AuthResult {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, keyId: '' };
  }

  const validKeys = (process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (validKeys.length === 0) {
    // No keys configured — reject all requests
    return { valid: false, keyId: '' };
  }

  const index = validKeys.indexOf(apiKey);
  if (index === -1) {
    return { valid: false, keyId: '' };
  }

  // Use a hash-based key ID so we don't leak the actual key
  const keyId = `key_${index}`;
  return { valid: true, keyId };
}

/**
 * Unauthorized JSON response.
 */
function unauthorizedResponse(message = 'Invalid or missing API key'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401 }
  );
}

type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * Middleware wrapper that enforces API key authentication.
 * Usage: export const GET = withAuth(async (request) => { ... });
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    const auth = validateApiKey(request);

    if (!auth.valid) {
      return unauthorizedResponse();
    }

    // Attach keyId to headers so downstream handlers can access it
    const requestWithAuth = request;
    (requestWithAuth as any).__authKeyId = auth.keyId;

    return handler(requestWithAuth, context);
  };
}

/**
 * Extract the authenticated key ID from a request processed by withAuth.
 */
export function getKeyId(request: NextRequest): string {
  return (request as any).__authKeyId || 'anonymous';
}
