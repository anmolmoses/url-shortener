import { formatDistanceToNow, format } from 'date-fns';

/**
 * Truncate a string to maxLen, adding ellipsis if truncated.
 */
export function truncate(str: string, maxLen: number = 50): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/**
 * Relative time string (e.g. "2h ago") with full date on hover.
 */
export function relativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Full date string for tooltips.
 */
export function fullDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

/**
 * Format a number with commas.
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

/**
 * Build the short URL from a slug.
 */
export function shortUrl(slug: string): string {
  return `${window.location.origin}/${slug}`;
}