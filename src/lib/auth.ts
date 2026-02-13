import { NextRequest, NextResponse } from 'next/server';

interface AuthResult {
  valid: boolean;
  keyId: string;
}

/**
 * Validate an API key from the X-API-Key header.
 * For MVP: checks against API_KEYS env var (comma-separated).
 */
export function validateApiKey(request: NextRequest): AuthResult {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, keyId: '' };
  }

  const validKeys = (process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (validKeys.length === 0) {
    // No keys configured — allow all (dev mode)
    return { valid: true, keyId: 'dev' };
  }

  const index = validKeys.indexOf(apiKey);
  if (index >= 0) {
    return { valid: true, keyId: `key-${index}` };
  }

  return { valid: false, keyId: '' };
}

/**
 * Middleware wrapper that enforces API key auth on a route handler.
 */
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const auth = validateApiKey(request);

    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid API key. Provide a valid X-API-Key header.' },
        { status: 401 }
      );
    }

    // Attach keyId to headers for downstream use
    request.headers.set('x-key-id', auth.keyId);

    return handler(request, context);
  };
}
