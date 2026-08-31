import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  APP_JWT_SECRET: z.string().min(32, 'APP_JWT_SECRET must be at least 32 characters'),
  APP_JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('mdc_session'),
  COOKIE_DOMAIN: z.string().optional(),

  FRONTEND_URL: z.string().url(),

  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_CALLBACK_URL: z.string().url(),
  AUTH0_LOGOUT_REDIRECT_URL: z.string().url().optional(),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  TRASH_PURGE_CRON: z.string().default('0 3 * * *'),
  TRASH_RETENTION_DAYS: z.coerce.number().default(30),
  COLLAB_PERSIST_DEBOUNCE_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  S3_ENDPOINT: parsed.data.S3_ENDPOINT || undefined,
};
