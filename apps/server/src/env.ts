import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const nodeEnv = process.env.NODE_ENV ?? 'development';

// Load the server package's .env regardless of the current working directory.
// Uses Node's built-in loader (Node >= 20.12), so no dotenv dependency.
// In tests, DATABASE_URL/SESSION_SECRET are provided by vitest.config.ts — skip
// the .env file so tests never touch the dev database.
if (nodeEnv !== 'test') {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '..', '.env');
  try {
    process.loadEnvFile(envPath);
  } catch {
    // No .env file present — fall back to real environment variables.
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me',
  PORT: Number(process.env.PORT ?? 3001),
  NODE_ENV: nodeEnv,
  isProd: nodeEnv === 'production',
};
