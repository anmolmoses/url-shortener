import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware
 *
 * Intercepts requests that look like short link slugs and rewrites them
 * to the Node.js API route at /api/r/[slug] for full Redis + Postgres access.
 *
 * This keeps the Edge runtime lightweight — all heavy lifting (Redis, DB,
 * analytics) happens in the Node.js API route.
 */

// Paths that should NOT be intercepted
const EXCLUDED_PREFIXES = ['/api', '/dashboard', '/_next', '/favicon'];

// Valid slug pattern: alphanumeric, hyphens, underscores, 1-64 chars
const SLUG_PATTERN = /^\/([a-zA-Z0-9_-]{1,64})$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip excluded paths
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Skip root path
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check if this looks like a slug
  const match = pathname.match(SLUG_PATTERN);
  if (!match) {
    return NextResponse.next();
  }

  const slug = match[1];

  // Rewrite to the Node.js API route (preserves original headers/IP)
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/api/r/${slug}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api (API routes)
     * - /dashboard (app pages)
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - files with extensions (static assets)
     */
    '/((?!api|dashboard|_next|favicon\\.ico|.*\\.).*)'
  ],
};
