import { UAParser } from 'ua-parser-js';
import { getCountry } from './geo';
import { db } from '@/db';
import { clicks, links } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

interface ClickRequest {
  headers: Headers;
  ip?: string;
}

/**
 * Extract the client IP from request headers.
 * Checks x-forwarded-for first, then x-real-ip, then falls back to req.ip.
 */
function extractIp(req: ClickRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first (client) IP
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return req.ip || '0.0.0.0';
}

/**
 * Parse device type from User-Agent string.
 * Returns 'desktop', 'mobile', 'tablet', or 'unknown'.
 */
function parseDeviceType(ua: string): string {
  const parser = new UAParser(ua);
  const device = parser.getDevice();
  const type = device.type;

  if (type === 'mobile') return 'mobile';
  if (type === 'tablet') return 'tablet';
  // ua-parser-js returns undefined for desktop devices
  if (!type) return 'desktop';
  return type;
}

/**
 * Record a click event for a shortened link.
 *
 * This function is designed to be called in a fire-and-forget manner
 * so it does NOT block the redirect response. All errors are caught
 * and logged rather than thrown.
 *
 * @param linkId - The database ID of the link
 * @param request - The incoming Request object
 */
export async function recordClick(
  linkId: string,
  request: ClickRequest
): Promise<void> {
  try {
    const ip = extractIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;
    const deviceType = parseDeviceType(userAgent);
    const country = getCountry(ip);

    // Parse browser and OS from UA
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || null;
    const os = parser.getOS().name || null;

    // Insert click row and increment link click count atomically
    await Promise.all([
      db.insert(clicks).values({
        id: crypto.randomUUID(),
        linkId,
        ip,
        userAgent,
        referrer,
        device: deviceType,
        browser,
        os,
        country,
        createdAt: new Date(),
      }),
      db
        .update(links)
        .set({ clickCount: sql`${links.clickCount} + 1` })
        .where(eq(links.id, linkId)),
    ]);
  } catch (error) {
    // Log but never throw — analytics must not break redirects
    console.error('[Analytics] Failed to record click:', error);
  }
}
