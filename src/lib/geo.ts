import geoip from 'geoip-lite';

/**
 * Check if an IP address is private/reserved.
 */
function isPrivateIp(ip: string): boolean {
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.')
  ) {
    return true;
  }

  // 172.16.0.0 – 172.31.255.255 (private range only)
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

/**
 * Get 2-char ISO country code from an IP address.
 * Returns null for private IPs or lookup failures.
 */
export function getCountry(ip: string): string | null {
  if (!ip || isPrivateIp(ip)) {
    return null;
  }

  const lookup = geoip.lookup(ip);
  return lookup?.country ?? null;
}
