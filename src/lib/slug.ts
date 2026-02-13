const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 7;

const RESERVED_WORDS = new Set(['api', 'dashboard', 'health', 'admin', 'login', 'settings']);
const ALIAS_REGEX = /^[a-zA-Z0-9-]{3,32}$/;

/**
 * Generate a random 7-character base62 slug.
 */
export function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  return Array.from(bytes)
    .map((b) => BASE62_CHARS[b % BASE62_CHARS.length])
    .join('');
}

export interface AliasValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate a custom alias: 3-32 chars, alphanumeric + hyphens, no reserved words.
 */
export function validateAlias(alias: string): AliasValidation {
  if (!ALIAS_REGEX.test(alias)) {
    return {
      valid: false,
      error: 'Alias must be 3-32 characters and contain only letters, numbers, and hyphens.',
    };
  }

  if (RESERVED_WORDS.has(alias.toLowerCase())) {
    return {
      valid: false,
      error: `The alias "${alias}" is reserved and cannot be used.`,
    };
  }

  return { valid: true };
}
