import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RewardDto, StarBalanceDto, RedemptionDto, RedemptionStatus } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { emitLiveEvent } from '../lib/events';
import { badRequest, notFound, forbidden } from '../lib/errors';
import { getStarBalance } from '../services/stars';

const rewardSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(300).nullish(),
  costStars: z.number().int().min(1).max(1000),
});
const grantSchema = z.object({
  userId: z.string().min(1),
  delta: z.number().int().refine((n) => n !== 0, 'delta darf nicht 0 sein'),
});
const decideSchema = z.object({ approve: z.boolean() });

type RewardRow = {
  id: string;
  title: string;
  description: string | null;
  costStars: number;
  active: boolean;
};
type RedemptionRow = {
  id: string;
  rewardId: string;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
};

function rewardDto(r: RewardRow): RewardDto {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    costStars: r.costStars,
    active: r.active,
  };
}

function redemptionDto(r: RedemptionRow, reward: { title: string; costStars: number }): RedemptionDto {
  return {
    id: r.id,
    rewardId: r.rewardId,
    rewardTitle: reward.title,
    costStars: reward.costStars,
    status: r.status as RedemptionStatus,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  };
}

export async function rewardRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/rewards', async (req) => {
    const { id } = req.params as { id: string };
    const { membership } = await requireMembership(req, id);
    const rewards = await prisma.reward.findMany({
      where: { koerbchenId: id, ...(membership.role === 'pupp' ? { active: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rewards.map(rewardDto);
  });

  app.post('/api/koerbchen/:id/rewards', async (req) => {
    const { id } = req.params as { id: string };
    const { user } = await requireMembership(req, id, 'caregiver');
    const input = rewardSchema.parse(req.body);
    const r = await prisma.reward.create({
      data: {
        koerbchenId: id,
        title: input.title,
        description: input.description ?? null,
        costStars: input.costStars,
        createdBy: user.id,
      },
    });
    emitLiveEvent({ type: 'reward.updated', koerbchenId: id, at: new Date().toISOString() });
    return rewardDto(r);
  });

  app.delete('/api/koerbchen/:id/rewards/:rewardId', async (req) => {
    const { id, rewardId } = req.params as { id: string; rewardId: string };
    await requireMembership(req, id, 'caregiver');
    const r = await prisma.reward.findFirst({ where: { id: rewardId, koerbchenId: id } });
    if (!r) throw notFound('Belohnung nicht gefunden');
    await prisma.reward.update({ where: { id: rewardId }, data: { active: false } });
    emitLiveEvent({ type: 'reward.updated', koerbchenId: id, at: new Date().toISOString() });
    return { ok: true };
  });

  app.get('/api/koerbchen/:id/stars', async (req) => {
    const { id } = req.params as { id: string };
    const { user, membership } = await requireMembership(req, id);
    const q = req.query as { userId?: string };
    const targetUserId = q.userId ?? user.id;
    if (targetUserId !== user.id && membership.role !== 'caregiver') {
      throw forbidden('Kein Zugriff auf andere Mitglieder');
    }
    const balance = await getStarBalance(id, targetUserId);
    const tx = await prisma.starTransaction.findMany({
      where: { koerbchenId: id, userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const dto: StarBalanceDto = {
      balance,
      transactions: tx.map((t) => ({
        id: t.id,
        delta: t.delta,
        reason: t.reason,
        createdAt: t.createdAt.toISOString(),
      })),
    };
    return dto;
  });

  app.post('/api/koerbchen/:id/stars/grant', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id, 'caregiver');
    const input = grantSchema.parse(req.body);
    const m = await prisma.membership.findUnique({
      where: { userId_koerbchenId: { userId: input.userId, koerbchenId: id } },
    });
    if (!m || m.role !== 'pupp') throw badRequest('Ziel ist kein Pupp im Körbchen');
    await prisma.starTransaction.create({
      data: { koerbchenId: id, userId: input.userId, delta: input.delta, reason: 'manual' },
    });
    emitLiveEvent({
      type: 'stars.updated',
      koerbchenId: id,
      at: new Date().toISOString(),
      payload: { userId: input.userId },
    });
    return { balance: await getStarBalance(id, input.userId) };
  });

  app.post('/api/koerbchen/:id/rewards/:rewardId/redeem', async (req) => {
    const { id, rewardId } = req.params as { id: string; rewardId: string };
    const { user } = await requireMembership(req, id, 'pupp');
    const reward = await prisma.reward.findFirst({
      where: { id: rewardId, koerbchenId: id, active: true },
    });
    if (!reward) throw notFound('Belohnung nicht gefunden');
    const balance = await getStarBalance(id, user.id);
    if (balance < reward.costStars) throw badRequest('Nicht genug Sterne');
    const redemption = await prisma.rewardRedemption.create({
      data: { rewardId, koerbchenId: id, puppUserId: user.id, status: 'requested' },
    });
    emitLiveEvent({
      type: 'redemption.updated',
      koerbchenId: id,
      actorUserId: user.id,
      at: new Date().toISOString(),
    });
    return redemptionDto(redemption, reward);
  });

  app.get('/api/koerbchen/:id/redemptions', async (req) => {
    const { id } = req.params as { id: string };
    const { user, membership } = await requireMembership(req, id);
    const where =
      membership.role === 'caregiver'
        ? { koerbchenId: id }
        : { koerbchenId: id, puppUserId: user.id };
    const rows = await prisma.rewardRedemption.findMany({
      where,
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => redemptionDto(r, r.reward));
  });

  app.post('/api/koerbchen/:id/redemptions/:redemptionId/decide', async (req) => {
    const { id, redemptionId } = req.params as { id: string; redemptionId: string };
    await requireMembership(req, id, 'caregiver');
    const { approve } = decideSchema.parse(req.body);
    const redemption = await prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, koerbchenId: id },
      include: { reward: true },
    });
    if (!redemption) throw notFound('Anfrage nicht gefunden');
    if (redemption.status !== 'requested') throw badRequest('Bereits entschieden');

    if (approve) {
      const balance = await getStarBalance(id, redemption.puppUserId);
      if (balance < redemption.reward.costStars) throw badRequest('Pupp hat nicht genug Sterne');
    }

    // Claim the request and book the stars together. The status guard is part
    // of the update, so two caregivers tapping "OK" at the same moment cannot
    // both win and charge the pupp twice.
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.rewardRedemption.updateMany({
        where: { id: redemptionId, status: 'requested' },
        data: { status: approve ? 'approved' : 'denied', decidedAt: new Date() },
      });
      if (claimed.count === 0) throw badRequest('Bereits entschieden');

      if (approve) {
        await tx.starTransaction.create({
          data: {
            koerbchenId: id,
            userId: redemption.puppUserId,
            delta: -redemption.reward.costStars,
            reason: 'redemption',
            refId: redemption.id,
          },
        });
      }
      return tx.rewardRedemption.findUniqueOrThrow({
        where: { id: redemptionId },
        include: { reward: true },
      });
    });

    const at = new Date().toISOString();
    emitLiveEvent({ type: 'redemption.updated', koerbchenId: id, at });
    if (approve) {
      emitLiveEvent({
        type: 'stars.updated',
        koerbchenId: id,
        at,
        payload: { userId: redemption.puppUserId },
      });
    }
    return redemptionDto(updated, updated.reward);
  });
}
