import { execSync } from 'node:child_process';

// Runs once before the test suite: migrate the dedicated test database.
// The test DB is a separate SQLite file so tests never touch dev.db.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
