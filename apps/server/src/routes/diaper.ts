import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DiaperStatusDto, ChangeStatusDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { emitLiveEvent } from '../lib/events';

const restockSchema = z.object({ count: z.number().int().min(1).max(1000) });
const changeSchema = z.object({ note: z.string().max(300).optional() });

function diaperStatus(count: number, lowThreshold: number): DiaperStatusDto {
  return { count, lowThreshold, isLow: count <= lowThreshold };
}

function changeStatus(lastChangeAt: Date | null, intervalMinutes: number): ChangeStatusDto {
  const dueAt = lastChangeAt ? new Date(lastChangeAt.getTime() + intervalMinutes * 60_000) : null;
  return {
    lastChangeAt: lastChangeAt ? lastChangeAt.toISOString() : null,
    intervalMinutes,
    dueAt: dueAt ? dueAt.toISOString() : null,
    isDue: dueAt ? Date.now() >= dueAt.getTime() : false,
  };
}

export async function diaperRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/diaper', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    return diaperStatus(k.diaperCount, k.diaperLowThreshold);
  });

  app.post('/api/koerbchen/:id/diaper/restock', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id, 'caregiver');
    const { count } = restockSchema.parse(req.body);
    const k = await prisma.koerbchen.update({
      where: { id },
      data: { diaperCount: { increment: count } },
    });
    emitLiveEvent({
      type: 'diaper.updated',
      koerbchenId: id,
      at: new Date().toISOString(),
      payload: { count: k.diaperCount },
    });
    return diaperStatus(k.diaperCount, k.diaperLowThreshold);
  });

  app.get('/api/koerbchen/:id/change', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    return changeStatus(k.lastChangeAt, k.changeIntervalMinutes);
  });

  // Log a change: any member. Records a ChangeLog, stamps lastChangeAt,
  // and consumes one diaper from the stock.
  app.post('/api/koerbchen/:id/change', async (req) => {
    const { id } = req.params as { id: string };
    const { user } = await requireMembership(req, id);
    const { note } = changeSchema.parse(req.body);
    const now = new Date();

    await prisma.changeLog.create({
      data: { koerbchenId: id, userId: user.id, note: note ?? null },
    });
    const current = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    const k = await prisma.koerbchen.update({
      where: { id },
      data: { lastChangeAt: now, diaperCount: Math.max(0, current.diaperCount - 1) },
    });

    const at = now.toISOString();
    emitLiveEvent({ type: 'change.logged', koerbchenId: id, actorUserId: user.id, at });
    emitLiveEvent({
      type: 'diaper.updated',
      koerbchenId: id,
      at,
      payload: { count: k.diaperCount },
    });
    if (k.diaperCount <= k.diaperLowThreshold) {
      emitLiveEvent({ type: 'diaper.low', koerbchenId: id, at, payload: { count: k.diaperCount } });
    }

    return {
      change: changeStatus(k.lastChangeAt, k.changeIntervalMinutes),
      diaper: diaperStatus(k.diaperCount, k.diaperLowThreshold),
    };
  });
}
