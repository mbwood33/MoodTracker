import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (value === '' || value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

const firebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const envSchema = z
  .object({
    VITE_APP_NAME: z.string().min(1).default('Mood Tracker'),
    VITE_FIREBASE_API_KEY: optionalString,
    VITE_FIREBASE_AUTH_DOMAIN: optionalString,
    VITE_FIREBASE_PROJECT_ID: optionalString,
    VITE_FIREBASE_STORAGE_BUCKET: optionalString,
    VITE_FIREBASE_MESSAGING_SENDER_ID: optionalString,
    VITE_FIREBASE_APP_ID: optionalString,
    VITE_USE_FIREBASE_EMULATORS: optionalBoolean.default(false),
  })
  .superRefine((environment, context) => {
    const configuredCount = firebaseKeys.filter((key) =>
      Boolean(environment[key]),
    ).length;
    if (configuredCount !== 0 && configuredCount !== firebaseKeys.length) {
      context.addIssue({
        code: 'custom',
        message:
          'All VITE_FIREBASE_* web app configuration values must be set together.',
      });
    }
  });

export const env = envSchema.parse(import.meta.env);
