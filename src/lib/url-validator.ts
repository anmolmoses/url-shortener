// Private/reserved IPv4 ranges
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '[::1]',
  '[::0]',
]);

export interface UrlValidation {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate a destination URL:
 * - Must be parseable
 * - Must use http or https scheme
 * - Must not point to localhost or private IPs
 */
export function validateUrl(input: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only http and https URLs are allowed.' };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'Localhost and loopback URLs are not allowed.' };
  }

  // Check private IP ranges
  for (const range of PRIVATE_RANGES) {
    if (range.test(hostname)) {
      return { valid: false, error: 'Private and reserved IP addresses are not allowed.' };
    }
  }

  return { valid: true, normalized: url.toString() };
}
