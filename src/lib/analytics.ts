import { db } from '@/lib/db';
import { clicks, links } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import UAParser from 'ua-parser-js';
import { getCountry } from './geo';

interface RequestLike {
  headers: Headers;
  ip?: string;
}

/**
 * Extract the client IP from a request.
 */
function extractIp(request: RequestLike): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first
    return forwarded.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

/**
 * Parse device type from User-Agent string.
 * Returns 'desktop', 'mobile', 'tablet', or 'unknown'.
 */
function parseDeviceType(ua: string | null): string {
  if (!ua) return 'unknown';
  const parser = new UAParser(ua);
  const device = parser.getDevice();
  return device.type || 'desktop'; // ua-parser returns undefined for desktop
}

/**
 * Parse browser name from User-Agent string.
 */
function parseBrowser(ua: string | null): string {
  if (!ua) return 'unknown';
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  return browser.name || 'unknown';
}

/**
 * Parse OS name from User-Agent string.
 */
function parseOs(ua: string | null): string {
  if (!ua) return 'unknown';
  const parser = new UAParser(ua);
  const os = parser.getOS();
  return os.name || 'unknown';
}

/**
 * Record a click event for a link.
 * Inserts a Click row and atomically increments Link.clickCount.
 *
 * This should be called in a fire-and-forget manner so it
 * does not block the redirect response.
 */
export async function recordClick(
  linkId: string,
  request: RequestLike
): Promise<void> {
  try {
    const ip = extractIp(request);
    const userAgent = request.headers.get('user-agent') || null;
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;

    const deviceType = parseDeviceType(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOs(userAgent);
    const country = getCountry(ip);

    // Insert click row and increment link click count in parallel
    await Promise.all([
      db.insert(clicks).values({
        linkId,
        ip,
        userAgent: userAgent || '',
        referrer,
        deviceType,
        browser,
        os,
        country,
        createdAt: new Date(),
      }),
      db
        .update(links)
        .set({
          clickCount: sql`${links.clickCount} + 1`,
        })
        .where(eq(links.id, linkId)),
    ]);
  } catch (err) {
    // Analytics failures should never surface to the user
    console.error('[analytics] failed to record click:', err);
  }
}
