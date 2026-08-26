import { buildApp } from './app';
import { env } from './env';
import { startReminderScheduler } from './services/reminders';

const app = await buildApp();

try {
  const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info?.(`Körbchen API listening on ${address}`);
  console.log(`Körbchen API listening on ${address}`);
  // Calendar reminder scheduler runs only in the long-lived server process.
  startReminderScheduler();
} catch (err) {
  console.error(err);
  process.exit(1);
}
