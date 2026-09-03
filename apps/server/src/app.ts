import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { env } from './env';
import { registerErrorHandler } from './lib/errors';
import { authPlugin } from './plugins/auth';
import { authRoutes } from './routes/auth';
import { koerbchenRoutes } from './routes/koerbchen';
import { drinkRoutes } from './routes/drink';
import { diaperRoutes } from './routes/diaper';
import { bagRoutes } from './routes/bags';
import { plushieRoutes } from './routes/plushies';
import { rewardRoutes } from './routes/rewards';
import { quickCallRoutes } from './routes/quickcall';
import { calendarRoutes } from './routes/calendar';
import { liveRoutes } from './routes/live';

// The built web app, served by this same server so one origin (and one port)
// covers the whole site — that is what makes it reachable through a single
// tunnel or LAN address. Absent during tests and before the first `npm run
// build`, in which case the API runs on its own.
const WEB_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isProd,
    // Behind a tunnel or reverse proxy the socket address is the proxy's, so
    // without this every visitor would look like the same client to the
    // rate limiter and the logs.
    trustProxy: true,
  });

  await app.register(cookie, { secret: env.SESSION_SECRET });
  registerErrorHandler(app);
  await app.register(authPlugin);

  app.get('/api/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(koerbchenRoutes);
  await app.register(drinkRoutes);
  await app.register(diaperRoutes);
  await app.register(bagRoutes);
  await app.register(plushieRoutes);
  await app.register(rewardRoutes);
  await app.register(quickCallRoutes);
  await app.register(calendarRoutes);
  await app.register(liveRoutes);

  await registerWebApp(app);

  return app;
}

// Serves the built single-page app and sends every unknown non-API path to
// index.html, so deep links and reloads work instead of 404ing.
async function registerWebApp(app: FastifyInstance) {
  if (!existsSync(join(WEB_DIST, 'index.html'))) return;

  await app.register(fastifyStatic, { root: WEB_DIST, prefix: '/' });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      return reply
        .status(404)
        .send({ error: { code: 'not_found', message: 'Route nicht gefunden' } });
    }
    return reply.sendFile('index.html');
  });
}
