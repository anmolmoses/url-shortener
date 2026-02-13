import { NextRequest } from 'next/server';

/**
 * Extract and validate API key from request headers.
 * Returns the API key string or null if missing/invalid.
 */
export function getApiKey(request: NextRequest): string | null {
  const key = request.headers.get('x-api-key');
  if (!key || key.trim().length === 0) return null;
  return key.trim();
}

/**
 * Require API key — returns error Response if missing, or the key string.
 */
export function requireApiKey(
  request: NextRequest
): { key: string } | { error: Response } {
  const key = getApiKey(request);
  if (!key) {
    return {
      error: Response.json(
        { error: 'Missing or invalid x-api-key header.' },
        { status: 401 }
      ),
    };
  }
  return { key };
}
