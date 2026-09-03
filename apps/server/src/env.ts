import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the server package's .env regardless of the current working directory.
// Uses Node's built-in loader (Node >= 20.12), so no dotenv dependency. The
// loader never overwrites variables that are already set, so a real environment
// variable (systemd's `Environment=`, a shell prefix) still beats the file.
// In tests, DATABASE_URL/SESSION_SECRET are provided by vitest.config.ts — skip
// the .env file so tests never touch the dev database.
if (process.env.NODE_ENV !== 'test') {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '..', '.env');
  try {
    process.loadEnvFile(envPath);
  } catch {
    // No .env file present — fall back to real environment variables.
  }
}

// Read *after* the file is loaded: NODE_ENV belongs in .env like every other
// setting, and reading it beforehand would leave a production deployment
// silently in development mode — no request logging, and the dev-secret guard
// at the bottom of this file would never fire.
const nodeEnv = process.env.NODE_ENV ?? 'development';

const DEV_SECRET = 'dev-insecure-secret-change-me';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
  SESSION_SECRET: process.env.SESSION_SECRET ?? DEV_SECRET,
  PORT: Number(process.env.PORT ?? 3001),
  // 0.0.0.0 binds every interface, so the site answers on the machine's LAN
  // address and through a tunnel, not just on localhost. Set HOST=127.0.0.1 to
  // keep it to this machine.
  HOST: process.env.HOST ?? '0.0.0.0',
  NODE_ENV: nodeEnv,
  isProd: nodeEnv === 'production',
};

// A production deployment that silently falls back to the published dev secret
// would let anyone forge session cookies, so refuse to start instead.
if (env.isProd && env.SESSION_SECRET === DEV_SECRET) {
  throw new Error(
    'SESSION_SECRET ist nicht gesetzt. In der Produktion muss ein eigenes Secret konfiguriert sein.',
  );
}
