import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DiaperType } from '@prisma/client';
import type { DiaperTypeDto, ChangeStatusDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { notFound, badRequest } from '../lib/errors';
import { emitLiveEvent } from '../lib/events';

const typeCreateSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(16).nullish(),
  note: z.string().max(300).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
const typeUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  emoji: z.string().max(16).nullish(),
  note: z.string().max(300).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});
const restockSchema = z.object({ count: z.number().int().min(1).max(1000) });
const changeSchema = z.object({
  note: z.string().max(300).optional(),
  diaperTypeId: z.string().optional(),
});

function toTypeDto(t: DiaperType, lowThreshold: number): DiaperTypeDto {
  return {
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    note: t.note,
    count: t.count,
    lowThreshold,
    isLow: t.count <= lowThreshold,
    sortOrder: t.sortOrder,
    active: t.active,
  };
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

// Loads all diaper types for a Körbchen together with the shared low-stock
// threshold, mapped to DTOs in display order.
async function listTypes(koerbchenId: string): Promise<DiaperTypeDto[]> {
  const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id: koerbchenId } });
  const types = await prisma.diaperType.findMany({
    where: { koerbchenId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return types.map((t) => toTypeDto(t, k.diaperLowThreshold));
}

// Fetches a type scoped to its Körbchen, 404 if it belongs elsewhere.
async function findType(koerbchenId: string, typeId: string): Promise<DiaperType> {
  const type = await prisma.diaperType.findFirst({ where: { id: typeId, koerbchenId } });
  if (!type) throw notFound('Windeltyp nicht gefunden');
  return type;
}

// Same, but refuses retired types — a change may only be logged against a type
// that is still in use.
async function findActiveType(koerbchenId: string, typeId: string): Promise<DiaperType> {
  const type = await findType(koerbchenId, typeId);
  if (!type.active) throw badRequest('Dieser Windeltyp ist nicht mehr aktiv');
  return type;
}

export async function diaperRoutes(app: FastifyInstance) {
  // List configured diaper types with their stock (any member).
  app.get('/api/koerbchen/:id/diaper', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    return listTypes(id);
  });

  // Create a diaper type (caregiver).
  app.post('/api/koerbchen/:id/diaper/types', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id, 'caregiver');
    const input = typeCreateSchema.parse(req.body);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    const type = await prisma.diaperType.create({
      data: {
        koerbchenId: id,
        name: input.name,
        emoji: input.emoji ?? null,
        note: input.note ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    emitLiveEvent({ type: 'diaper.updated', koerbchenId: id, at: new Date().toISOString() });
    return toTypeDto(type, k.diaperLowThreshold);
  });

  // Edit a diaper type's name / emoji / note / order / active (caregiver).
  app.patch('/api/koerbchen/:id/diaper/types/:typeId', async (req) => {
    const { id, typeId } = req.params as { id: string; typeId: string };
    await requireMembership(req, id, 'caregiver');
    await findType(id, typeId);
    const input = typeUpdateSchema.parse(req.body);
    const data: {
      name?: string;
      emoji?: string | null;
      note?: string | null;
      sortOrder?: number;
      active?: boolean;
    } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.emoji !== undefined) data.emoji = input.emoji;
    if (input.note !== undefined) data.note = input.note;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.active !== undefined) data.active = input.active;

    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    const type = await prisma.diaperType.update({ where: { id: typeId }, data });
    emitLiveEvent({ type: 'diaper.updated', koerbchenId: id, at: new Date().toISOString() });
    return toTypeDto(type, k.diaperLowThreshold);
  });

  // Remove a diaper type (caregiver). Past changes keep their history via
  // diaperTypeId → SetNull.
  app.delete('/api/koerbchen/:id/diaper/types/:typeId', async (req) => {
    const { id, typeId } = req.params as { id: string; typeId: string };
    await requireMembership(req, id, 'caregiver');
    await findType(id, typeId);
    await prisma.diaperType.delete({ where: { id: typeId } });
    emitLiveEvent({ type: 'diaper.updated', koerbchenId: id, at: new Date().toISOString() });
    return { ok: true };
  });

  // Add stock to a single type (caregiver).
  app.post('/api/koerbchen/:id/diaper/types/:typeId/restock', async (req) => {
    const { id, typeId } = req.params as { id: string; typeId: string };
    await requireMembership(req, id, 'caregiver');
    await findType(id, typeId);
    const { count } = restockSchema.parse(req.body);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    const type = await prisma.diaperType.update({
      where: { id: typeId },
      data: { count: { increment: count } },
    });
    emitLiveEvent({
      type: 'diaper.updated',
      koerbchenId: id,
      at: new Date().toISOString(),
      payload: { typeId: type.id, count: type.count },
    });
    return toTypeDto(type, k.diaperLowThreshold);
  });

  // Change status (any member).
  app.get('/api/koerbchen/:id/change', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const k = await prisma.koerbchen.findUniqueOrThrow({ where: { id } });
    return changeStatus(k.lastChangeAt, k.changeIntervalMinutes);
  });

  // Log a change: any member. Records a ChangeLog, stamps lastChangeAt, and
  // consumes one diaper from the chosen type's stock (if a type is given).
  app.post('/api/koerbchen/:id/change', async (req) => {
    const { id } = req.params as { id: string };
    const { user } = await requireMembership(req, id);
    const { note, diaperTypeId } = changeSchema.parse(req.body);
    const now = new Date();

    // Validate the type belongs to this Körbchen (and is still in use) before
    // recording anything.
    if (diaperTypeId) await findActiveType(id, diaperTypeId);

    // Log, consume stock and stamp the Körbchen as one unit, so a failure can
    // never leave a change recorded without its diaper being deducted.
    const { consumed, k } = await prisma.$transaction(async (tx) => {
      await tx.changeLog.create({
        data: {
          koerbchenId: id,
          userId: user.id,
          diaperTypeId: diaperTypeId ?? null,
          note: note ?? null,
        },
      });

      let consumed: DiaperType | null = null;
      if (diaperTypeId) {
        // Decrement in the database rather than reading the count first, so
        // simultaneous changes cannot overwrite each other's result. The guard
        // keeps the stock from going negative when it is already empty.
        await tx.diaperType.updateMany({
          where: { id: diaperTypeId, count: { gt: 0 } },
          data: { count: { decrement: 1 } },
        });
        consumed = await tx.diaperType.findUniqueOrThrow({ where: { id: diaperTypeId } });
      }

      const k = await tx.koerbchen.update({ where: { id }, data: { lastChangeAt: now } });
      return { consumed, k };
    });

    const at = now.toISOString();
    emitLiveEvent({ type: 'change.logged', koerbchenId: id, actorUserId: user.id, at });
    if (consumed) {
      emitLiveEvent({
        type: 'diaper.updated',
        koerbchenId: id,
        at,
        payload: { typeId: consumed.id, count: consumed.count },
      });
      if (consumed.count <= k.diaperLowThreshold) {
        emitLiveEvent({
          type: 'diaper.low',
          koerbchenId: id,
          at,
          payload: { typeId: consumed.id, count: consumed.count },
        });
      }
    }

    return {
      change: changeStatus(k.lastChangeAt, k.changeIntervalMinutes),
      diaper: await listTypes(id),
    };
  });
}
