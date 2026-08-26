import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { KoerbchenDto, Role } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireUser, requireMembership } from '../plugins/auth';
import { conflict, notFound, badRequest } from '../lib/errors';
import { emitLiveEvent } from '../lib/events';

const roleSchema = z.enum(['caregiver', 'pupp']);
const createSchema = z.object({ name: z.string().min(1).max(60), role: roleSchema });
const joinSchema = z.object({ inviteCode: z.string().min(1), role: roleSchema });
const settingsSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  drinkGoalMl: z.number().int().min(100).max(10000).optional(),
  changeIntervalMinutes: z.number().int().min(15).max(1440).optional(),
  diaperLowThreshold: z.number().int().min(0).max(100).optional(),
});

function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function toDto(koerbchenId: string): Promise<KoerbchenDto> {
  const k = await prisma.koerbchen.findUniqueOrThrow({
    where: { id: koerbchenId },
    include: { memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  return {
    id: k.id,
    name: k.name,
    inviteCode: k.inviteCode,
    drinkGoalMl: k.drinkGoalMl,
    changeIntervalMinutes: k.changeIntervalMinutes,
    diaperCount: k.diaperCount,
    diaperLowThreshold: k.diaperLowThreshold,
    lastChangeAt: k.lastChangeAt ? k.lastChangeAt.toISOString() : null,
    members: k.memberships.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName,
      role: m.role as Role,
    })),
  };
}

export async function koerbchenRoutes(app: FastifyInstance) {
  app.post('/api/koerbchen', async (req) => {
    const user = requireUser(req);
    const input = createSchema.parse(req.body);
    let inviteCode = makeInviteCode();
    while (await prisma.koerbchen.findUnique({ where: { inviteCode } })) {
      inviteCode = makeInviteCode();
    }
    const k = await prisma.koerbchen.create({ data: { name: input.name, inviteCode } });
    await prisma.membership.create({
      data: { userId: user.id, koerbchenId: k.id, role: input.role },
    });
    return toDto(k.id);
  });

  app.post('/api/koerbchen/join', async (req) => {
    const user = requireUser(req);
    const input = joinSchema.parse(req.body);
    const k = await prisma.koerbchen.findUnique({
      where: { inviteCode: input.inviteCode.toUpperCase() },
    });
    if (!k) throw notFound('Ungültiger Invite-Code');
    const existing = await prisma.membership.findUnique({
      where: { userId_koerbchenId: { userId: user.id, koerbchenId: k.id } },
    });
    if (existing) throw conflict('Du bist bereits Mitglied');
    await prisma.membership.create({
      data: { userId: user.id, koerbchenId: k.id, role: input.role },
    });
    emitLiveEvent({
      type: 'koerbchen.updated',
      koerbchenId: k.id,
      actorUserId: user.id,
      at: new Date().toISOString(),
    });
    return toDto(k.id);
  });

  app.get('/api/koerbchen/:id', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    return toDto(id);
  });

  app.patch('/api/koerbchen/:id/settings', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id, 'caregiver');
    const input = settingsSchema.parse(req.body);
    if (Object.keys(input).length === 0) throw badRequest('Keine Einstellungen angegeben');
    await prisma.koerbchen.update({ where: { id }, data: input });
    emitLiveEvent({ type: 'koerbchen.updated', koerbchenId: id, at: new Date().toISOString() });
    return toDto(id);
  });
}
