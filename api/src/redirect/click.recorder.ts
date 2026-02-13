import { FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';

/**
 * Fire-and-forget click recording.
 * Failures here must NEVER propagate — all wrapped in try/catch.
 */
export function recordClick(linkId: string, req: FastifyRequest): void {
  (async () => {
    try {
      // Extract IP
      const forwarded = req.headers['x-forwarded-for'];
      const ip =
        (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || 'unknown';

      // Parse user-agent
      const uaString = req.headers['user-agent'] || '';
      const parser = new UAParser(uaString);
      const ua = parser.getResult();
      const browser = ua.browser.name || null;
      const os = ua.os.name || null;
      const deviceType = ua.device.type || 'desktop'; // mobile, tablet, or desktop

      // Referrer
      const referrer = (req.headers['referer'] || req.headers['referrer'] || null) as
        | string
        | null;

      // Geo lookup
      let country: string | null = null;
      let city: string | null = null;
      if (ip && ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
        const geo = geoip.lookup(ip);
        if (geo) {
          country = geo.country || null;
          city = geo.city || null;
        }
      }

      await prisma.clickEvent.create({
        data: {
          linkId,
          ip,
          userAgent: uaString || null,
          browser,
          os,
          deviceType,
          referrer,
          country,
          city,
        },
      });
    } catch (err) {
      // Silently fail — click recording must never break redirects
      console.error('[click-recorder] Failed to record click:', err);
    }
  })();
}
