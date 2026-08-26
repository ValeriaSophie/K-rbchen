import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';
import type { Role } from '@koerbchen/shared';
import { getSessionUser, type SessionUser } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { unauthorized, forbidden, notFound } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: SessionUser | null;
  }
}

// Global plugin: loads the current user from the session cookie onto every request.
export const authPlugin = fp(async (app) => {
  app.decorateRequest('currentUser', null);
  app.addHook('preHandler', async (req) => {
    req.currentUser = await getSessionUser(req);
  });
});

// Throws 401 unless a user is logged in.
export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.currentUser) throw unauthorized();
  return req.currentUser;
}

// Ensures the user is a member of the Körbchen (and optionally has a role).
export async function requireMembership(req: FastifyRequest, koerbchenId: string, role?: Role) {
  const user = requireUser(req);
  const membership = await prisma.membership.findUnique({
    where: { userId_koerbchenId: { userId: user.id, koerbchenId } },
  });
  if (!membership) throw notFound('Körbchen nicht gefunden');
  if (role && membership.role !== role) throw forbidden(`Erfordert Rolle: ${role}`);
  return { user, membership };
}
