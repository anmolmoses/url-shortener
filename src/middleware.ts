import { NextRequest, NextResponse } from 'next/server';

// Paths that should NOT be intercepted by the redirect engine
const EXCLUDED_PREFIXES = [
  '/api',
  '/dashboard',
  '/_next',
  '/favicon',
  '/static',
  '/login',
  '/settings',
];

export const config = {
  // Match all paths except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip excluded paths
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Skip root path
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Extract slug (strip leading slash)
  const slug = pathname.slice(1);

  // Skip slugs with nested paths (e.g., /some/nested/path)
  if (slug.includes('/')) {
    return NextResponse.next();
  }

  // Rewrite to the redirect API route handler (runs in Node.js runtime)
  // This allows us to use ioredis, geoip-lite, and Drizzle ORM
  const redirectUrl = new URL(`/api/r/${slug}`, request.url);

  // Forward original headers so the route handler can extract analytics data
  return NextResponse.rewrite(redirectUrl);
}
