import { NextRequest, NextResponse } from 'next/server';

/**
 * Paths that should NOT be intercepted by the redirect engine.
 */
const EXCLUDED_PREFIXES = [
  '/api',
  '/dashboard',
  '/_next',
  '/favicon',
  '/login',
  '/settings',
];

/**
 * Next.js middleware — intercepts requests and rewrites slug paths
 * to the internal /api/r/[slug] redirect handler.
 *
 * This approach keeps the middleware lightweight (Edge-compatible)
 * while the actual redirect logic (Redis, Postgres, analytics)
 * runs in the Node.js API route.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip excluded paths
  for (const prefix of EXCLUDED_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Skip root path
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Extract slug (strip leading slash)
  const slug = pathname.slice(1);

  // Skip if slug contains additional path segments (e.g. /foo/bar)
  if (slug.includes('/')) {
    return NextResponse.next();
  }

  // Rewrite to internal redirect API route
  const url = request.nextUrl.clone();
  url.pathname = `/api/r/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * The middleware function itself handles fine-grained exclusions.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
