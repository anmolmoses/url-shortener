import geoip from 'geoip-lite';

/**
 * Look up the 2-character ISO country code for an IP address.
 * Returns null for localhost, private IPs, or unknown addresses.
 */
export function getCountry(ip: string): string | null {
  if (!ip) return null;

  // Strip IPv6-mapped IPv4 prefix
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Skip localhost and private IPs
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.')
  ) {
    return null;
  }

  const geo = geoip.lookup(cleanIp);
  return geo?.country ?? null;
}
