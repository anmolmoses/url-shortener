import { UAParser } from 'ua-parser-js';
import { getCountry } from './geo';
import { prisma } from './prisma';

/**
 * Extract the client IP from a Request, checking common proxy headers.
 */
function extractIp(request: Request, headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated; first is the client
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback — won't work in all runtimes but covers Node
  return '0.0.0.0';
}

/**
 * Record a click event for a link.
 * This runs async and must NOT block the redirect response.
 *
 * - Parses UA once and extracts device, browser, and OS
 * - Looks up country from IP via geoip-lite
 * - Inserts a Click row into Postgres
 * - Atomically increments Link.clickCount
 */
export async function recordClick(
  linkId: string,
  request: Request
): Promise<void> {
  try {
    const headers = new Headers(
      request.headers as unknown as HeadersInit
    );
    const ip = extractIp(request, headers);
    const userAgent = headers.get('user-agent') || '';
    const referrer = headers.get('referer') || headers.get('referrer') || '';

    // Parse UA once — extract all fields from single instance
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    const deviceType = uaResult.device.type || 'desktop'; // mobile, tablet, or fallback desktop
    const browser = uaResult.browser.name || 'Unknown';
    const os = uaResult.os.name || 'Unknown';

    // Geo lookup
    const country = getCountry(ip);

    // Run both DB operations concurrently
    await Promise.all([
      // 1. Insert the Click row
      prisma.click.create({
        data: {
          linkId,
          ip,
          userAgent,
          referrer: referrer || null,
          deviceType,
          browser,
          os,
          country,
        },
      }),

      // 2. Atomically increment Link.clickCount
      prisma.link.update({
        where: { id: linkId },
        data: {
          clickCount: { increment: 1 },
        },
      }),
    ]);
  } catch (err) {
    // Log but never throw — analytics must not crash the redirect path
    console.error('[analytics] Failed to record click:', err);
  }
}
