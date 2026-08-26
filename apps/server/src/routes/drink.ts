import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DrinkTodayDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { forbidden } from '../lib/errors';
import { emitLiveEvent } from '../lib/events';
import { getDrinkTotalToday, awardDrinkGoalIfReached, startOfToday } from '../services/stars';

const logSchema = z.object({ amountMl: z.number().int().min(1).max(5000) });

async function buildToday(
  koerbchenId: string,
  userId: string,
  goalMl: number,
): Promise<DrinkTodayDto> {
  const logs = await prisma.drinkLog.findMany({
    where: { koerbchenId, userId, createdAt: { gte: startOfToday() } },
    orderBy: { createdAt: 'desc' },
  });
  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
  return {
    goalMl,
    totalMl,
    reachedGoal: totalMl >= goalMl,
    logs: logs.map((l) => ({
      id: l.id,
      amountMl: l.amountMl,
      createdAt: l.createdAt.toISOString(),
      userId: l.userId,
    })),
  };
}

export async function drinkRoutes(app: FastifyInstance) {
  app.post('/api/koerbchen/:id/drink', async (req) => {
    const { id } = req.params as { id: string };
    const { user, membership } = await requireMembership(req, id);
    if (membership.role !== 'pupp') throw forbidden('Nur ein Pupp kann Trinken eintragen');
    const input = logSchema.parse(req.body);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });

    await prisma.drinkLog.create({
      data: { koerbchenId: id, userId: user.id, amountMl: input.amountMl },
    });
    const totalMl = await getDrinkTotalToday(id, user.id);
    const awarded = await awardDrinkGoalIfReached(id, user.id, k.drinkGoalMl, totalMl);
    const at = new Date().toISOString();

    emitLiveEvent({
      type: 'drink.logged',
      koerbchenId: id,
      actorUserId: user.id,
      at,
      payload: { userId: user.id, totalMl },
    });
    if (awarded) {
      emitLiveEvent({
        type: 'drink.goalReached',
        koerbchenId: id,
        actorUserId: user.id,
        at,
        payload: { userId: user.id },
      });
      emitLiveEvent({
        type: 'stars.updated',
        koerbchenId: id,
        actorUserId: user.id,
        at,
        payload: { userId: user.id },
      });
    }
    return buildToday(id, user.id, k.drinkGoalMl);
  });

  app.get('/api/koerbchen/:id/drink/today', async (req) => {
    const { id } = req.params as { id: string };
    const { user, membership } = await requireMembership(req, id);
    const query = req.query as { userId?: string };
    const targetUserId = query.userId ?? user.id;
    if (targetUserId !== user.id && membership.role !== 'caregiver') {
      throw forbidden('Kein Zugriff auf andere Mitglieder');
    }
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    return buildToday(id, targetUserId, k.drinkGoalMl);
  });
}
