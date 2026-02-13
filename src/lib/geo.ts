import geoip from 'geoip-lite';

// Private/reserved IP ranges that geoip can't resolve
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^0\.0\.0\.0$/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Look up the 2-character ISO country code for an IP address.
 * Returns null for private/reserved IPs or unknown addresses.
 */
export function getCountry(ip: string): string | null {
  if (!ip || isPrivateIp(ip)) return null;

  const lookup = geoip.lookup(ip);
  return lookup?.country ?? null;
}

/**
 * Get full geo data (country, region, city) for an IP.
 */
export function getGeoData(
  ip: string
): { country: string; region: string; city: string } | null {
  if (!ip || isPrivateIp(ip)) return null;

  const lookup = geoip.lookup(ip);
  if (!lookup) return null;

  return {
    country: lookup.country,
    region: lookup.region,
    city: lookup.city,
  };
}
