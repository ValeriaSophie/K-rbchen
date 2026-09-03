import { networkInterfaces } from 'node:os';
import { buildApp } from './app';
import { env } from './env';
import { startReminderScheduler } from './services/reminders';

// Every non-internal IPv4 address this machine answers on — printed at startup
// so you can reach the site from a phone without hunting for the address.
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);
}

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Körbchen läuft auf   http://localhost:${env.PORT}`);
  if (env.HOST === '0.0.0.0') {
    for (const address of lanAddresses()) {
      console.log(`  im Netzwerk unter   http://${address}:${env.PORT}`);
    }
  }
  // Calendar reminder scheduler runs only in the long-lived server process.
  startReminderScheduler();
} catch (err) {
  console.error(err);
  process.exit(1);
}
