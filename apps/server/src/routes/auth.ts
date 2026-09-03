import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import type { MeDto, Role } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, createSession, destroySession } from '../lib/auth';
import { requireUser } from '../plugins/auth';
import { conflict, unauthorized } from '../lib/errors';

// E-Mail-Adressen werden normalisiert gespeichert und gesucht, damit
// "Anna@Example.de" und "anna@example.de" dasselbe Konto sind. Getrimmt wird
// vor der Formatprüfung, sonst scheitert eine kopierte Adresse mit
// Leerzeichen am Rand bereits an der Validierung.
const email = z
  .string()
  .trim()
  .pipe(z.email())
  .transform((s) => s.toLowerCase());

const registerSchema = z.object({
  email,
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  displayName: z.string().min(1).max(60),
});
const loginSchema = z.object({
  email,
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

// Guessing passwords should stay slow once the site is reachable from outside
// the home network. Applies per client IP to the two endpoints that accept
// credentials; the rest of the API is untouched so normal use never throttles.
const CREDENTIAL_LIMIT = {
  rateLimit: { max: 10, timeWindow: '5 minutes' },
};

export async function authRoutes(app: FastifyInstance) {
  // The 429 is shaped into the standard error envelope by the global handler.
  await app.register(rateLimit, { global: false });

  app.post('/api/auth/register', { config: CREDENTIAL_LIMIT }, async (req, reply) => {
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

  app.post('/api/auth/login', { config: CREDENTIAL_LIMIT }, async (req, reply) => {
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
