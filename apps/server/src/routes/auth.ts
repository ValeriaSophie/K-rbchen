import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MeDto, Role } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, createSession, destroySession } from '../lib/auth';
import { requireUser } from '../plugins/auth';
import { conflict, unauthorized } from '../lib/errors';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  displayName: z.string().min(1).max(60),
});
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

async function buildMe(userId: string): Promise<MeDto> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    membership: membership
      ? { role: membership.role as Role, koerbchenId: membership.koerbchenId }
      : null,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('E-Mail ist bereits registriert');
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        displayName: input.displayName,
      },
    });
    await createSession(user.id, reply);
    return buildMe(user.id);
  });

  app.post('/api/auth/login', async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized('E-Mail oder Passwort falsch');
    }
    await createSession(user.id, reply);
    return buildMe(user.id);
  });

  app.post('/api/auth/logout', async (req, reply) => {
    await destroySession(req, reply);
    return { ok: true };
  });

  app.get('/api/auth/me', async (req) => {
    const user = requireUser(req);
    return buildMe(user.id);
  });
}
