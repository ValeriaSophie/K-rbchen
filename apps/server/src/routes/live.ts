import type { FastifyInstance } from 'fastify';
import { requireMembership } from '../plugins/auth';
import { subscribe } from '../lib/events';

// Server-Sent Events stream of all live events for one Körbchen.
export async function liveRoutes(app: FastifyInstance) {
  app.get('/api/live/:koerbchenId', async (req, reply) => {
    const { koerbchenId } = req.params as { koerbchenId: string };
    await requireMembership(req, koerbchenId);

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(': connected\n\n');

    const unsubscribe = subscribe(koerbchenId, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, 25000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
