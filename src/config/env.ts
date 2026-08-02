import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    VITE_APP_NAME: z.string().min(1).default('Mood Tracker'),
    VITE_SUPABASE_URL: optionalUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: optionalString,
  })
  .superRefine((env, context) => {
    const hasUrl = Boolean(env.VITE_SUPABASE_URL);
    const hasKey = Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY);

    if (hasUrl !== hasKey) {
      context.addIssue({
        code: 'custom',
        message:
          'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set together.',
      });
    }
  });

export const env = envSchema.parse(import.meta.env);
