import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Bag, BagItem } from '@prisma/client';
import type { BagDto, BagItemDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { notFound } from '../lib/errors';
import { emitLiveEvent } from '../lib/events';

const bagCreateSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(16).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
const bagUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  emoji: z.string().max(16).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
const itemCreateSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(999).optional(),
  note: z.string().max(300).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
const itemUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  note: z.string().max(300).nullish(),
  packed: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

type BagWithItems = Bag & { items: BagItem[] };

function toItemDto(i: BagItem): BagItemDto {
  return {
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    note: i.note,
    packed: i.packed,
    sortOrder: i.sortOrder,
  };
}

function toBagDto(b: BagWithItems): BagDto {
  const items = [...b.items]
    .sort((a, c) => a.sortOrder - c.sortOrder || a.createdAt.getTime() - c.createdAt.getTime())
    .map(toItemDto);
  return {
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    sortOrder: b.sortOrder,
    items,
    totalCount: items.length,
    packedCount: items.filter((i) => i.packed).length,
  };
}

// Minimal slice of the client the seeding needs, so callers can pass either the
// global client or a transaction handle.
type BagWriter = { bag: { createMany: typeof prisma.bag.createMany } };

// Seed the two default bags for a fresh Körbchen ("einmal eingerichtet").
export async function createDefaultBags(koerbchenId: string, db: BagWriter = prisma) {
  await db.bag.createMany({
    data: [
      { koerbchenId, name: 'Schwimmtasche', emoji: '🏊', sortOrder: 0 },
      { koerbchenId, name: 'Wickeltasche', emoji: '🧷', sortOrder: 1 },
    ],
  });
}

// Scope a bag to its Körbchen; 404 if it belongs elsewhere.
async function findBag(koerbchenId: string, bagId: string): Promise<Bag> {
  const bag = await prisma.bag.findFirst({ where: { id: bagId, koerbchenId } });
  if (!bag) throw notFound('Tasche nicht gefunden');
  return bag;
}
async function findItem(bagId: string, itemId: string): Promise<BagItem> {
  const item = await prisma.bagItem.findFirst({ where: { id: itemId, bagId } });
  if (!item) throw notFound('Eintrag nicht gefunden');
  return item;
}

function bagWithItems(bagId: string) {
  return prisma.bag.findUniqueOrThrow({ where: { id: bagId }, include: { items: true } });
}
function touch(koerbchenId: string) {
  emitLiveEvent({ type: 'bag.updated', koerbchenId, at: new Date().toISOString() });
}

// Bags & packing lists. Any member may manage everything.
export async function bagRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/bags', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const bags = await prisma.bag.findMany({
      where: { koerbchenId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { items: true },
    });
    return bags.map(toBagDto);
  });

  app.post('/api/koerbchen/:id/bags', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const input = bagCreateSchema.parse(req.body);
    const bag = await prisma.bag.create({
      data: {
        koerbchenId: id,
        name: input.name,
        emoji: input.emoji ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      include: { items: true },
    });
    touch(id);
    return toBagDto(bag);
  });

  app.patch('/api/koerbchen/:id/bags/:bagId', async (req) => {
    const { id, bagId } = req.params as { id: string; bagId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    const input = bagUpdateSchema.parse(req.body);
    const data: { name?: string; emoji?: string | null; sortOrder?: number } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.emoji !== undefined) data.emoji = input.emoji;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    await prisma.bag.update({ where: { id: bagId }, data });
    touch(id);
    return toBagDto(await bagWithItems(bagId));
  });

  app.delete('/api/koerbchen/:id/bags/:bagId', async (req) => {
    const { id, bagId } = req.params as { id: string; bagId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    await prisma.bag.delete({ where: { id: bagId } });
    touch(id);
    return { ok: true };
  });

  app.post('/api/koerbchen/:id/bags/:bagId/items', async (req) => {
    const { id, bagId } = req.params as { id: string; bagId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    const input = itemCreateSchema.parse(req.body);
    const item = await prisma.bagItem.create({
      data: {
        bagId,
        name: input.name,
        quantity: input.quantity ?? 1,
        note: input.note ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    touch(id);
    return toItemDto(item);
  });

  app.patch('/api/koerbchen/:id/bags/:bagId/items/:itemId', async (req) => {
    const { id, bagId, itemId } = req.params as { id: string; bagId: string; itemId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    await findItem(bagId, itemId);
    const input = itemUpdateSchema.parse(req.body);
    const data: {
      name?: string;
      quantity?: number;
      note?: string | null;
      packed?: boolean;
      sortOrder?: number;
    } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.note !== undefined) data.note = input.note;
    if (input.packed !== undefined) data.packed = input.packed;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    await prisma.bagItem.update({ where: { id: itemId }, data });
    touch(id);
    return toBagDto(await bagWithItems(bagId));
  });

  app.delete('/api/koerbchen/:id/bags/:bagId/items/:itemId', async (req) => {
    const { id, bagId, itemId } = req.params as { id: string; bagId: string; itemId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    await findItem(bagId, itemId);
    await prisma.bagItem.delete({ where: { id: itemId } });
    touch(id);
    return toBagDto(await bagWithItems(bagId));
  });

  // Uncheck everything so the bag is ready to pack again.
  app.post('/api/koerbchen/:id/bags/:bagId/reset', async (req) => {
    const { id, bagId } = req.params as { id: string; bagId: string };
    await requireMembership(req, id);
    await findBag(id, bagId);
    await prisma.bagItem.updateMany({ where: { bagId }, data: { packed: false } });
    touch(id);
    return toBagDto(await bagWithItems(bagId));
  });
}
