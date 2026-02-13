import { z } from 'zod';

const RESERVED_SLUGS = ['api', 'auth', 'dashboard', 'health', 'app'];

const aliasSchema = z
  .string()
  .min(3, 'Alias must be at least 3 characters')
  .max(32, 'Alias must be at most 32 characters')
  .regex(/^[a-zA-Z0-9-]+$/, 'Alias may only contain letters, numbers, and hyphens')
  .refine((val) => !RESERVED_SLUGS.includes(val.toLowerCase()), {
    message: 'This alias is reserved',
  });

export const createLinkSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'URL must use http or https protocol' },
    ),
  alias: aliasSchema.optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'Must be a valid ISO 8601 date' })
    .optional(),
});

export const updateLinkSchema = z.object({
  destinationUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'URL must use http or https protocol' },
    )
    .optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'Must be a valid ISO 8601 date' })
    .nullable()
    .optional(),
});

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;
