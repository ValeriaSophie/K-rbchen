import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma';
import { env } from '../env';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Creates a DB session row and sets the session cookie on the reply.
export async function createSession(userId: string, reply: FastifyReply): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { token: crypto.randomUUID(), userId, expiresAt },
  });
  reply.setCookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.isProd,
    expires: expiresAt,
  });
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies[SESSION_COOKIE];
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

// Resolves the current user from the session cookie, or null.
export async function getSessionUser(req: FastifyRequest): Promise<SessionUser | null> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
  };
}
