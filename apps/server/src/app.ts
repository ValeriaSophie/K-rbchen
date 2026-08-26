import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { env } from './env';
import { registerErrorHandler } from './lib/errors';
import { authPlugin } from './plugins/auth';
import { authRoutes } from './routes/auth';
import { koerbchenRoutes } from './routes/koerbchen';
import { drinkRoutes } from './routes/drink';
import { diaperRoutes } from './routes/diaper';
import { rewardRoutes } from './routes/rewards';
import { quickCallRoutes } from './routes/quickcall';
import { liveRoutes } from './routes/live';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isProd,
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
  await app.register(rewardRoutes);
  await app.register(quickCallRoutes);
  await app.register(liveRoutes);

  return app;
}
