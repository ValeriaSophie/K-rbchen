import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Plushie } from '@prisma/client';
import type { PlushieDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { notFound } from '../lib/errors';
import { emitLiveEvent } from '../lib/events';

// Photos are stored inline as client-resized data: URLs, so cap the size to
// keep the database sane (a ~512px JPEG thumbnail stays well under this).
const PHOTO_MAX = 500_000;
const photoField = z
  .string()
  .max(PHOTO_MAX, 'Foto ist zu groß')
  .refine((s) => s.startsWith('data:image/'), 'Ungültiges Bildformat')
  .nullish();
const text = (max: number) => z.string().max(max).nullish();

const createSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(16).nullish(),
  species: text(60),
  character: text(300),
  favorites: text(300),
  bio: text(1000),
  photo: photoField,
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  emoji: z.string().max(16).nullish(),
  species: text(60),
  character: text(300),
  favorites: text(300),
  bio: text(1000),
  photo: photoField,
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

type PlushieData = {
  name?: string;
  emoji?: string | null;
  species?: string | null;
  character?: string | null;
  favorites?: string | null;
  bio?: string | null;
  photo?: string | null;
  sortOrder?: number;
};

function toDto(p: Plushie): PlushieDto {
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    species: p.species,
    character: p.character,
    favorites: p.favorites,
    bio: p.bio,
    photo: p.photo,
    sortOrder: p.sortOrder,
  };
}

async function findPlushie(koerbchenId: string, plushieId: string): Promise<Plushie> {
  const p = await prisma.plushie.findFirst({ where: { id: plushieId, koerbchenId } });
  if (!p) throw notFound('Kuscheltier nicht gefunden');
  return p;
}
function touch(koerbchenId: string) {
  emitLiveEvent({ type: 'plushie.updated', koerbchenId, at: new Date().toISOString() });
}

// Plushie Steckbriefe. Any member may manage everything.
export async function plushieRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/plushies', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const list = await prisma.plushie.findMany({
      where: { koerbchenId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return list.map(toDto);
  });

  app.post('/api/koerbchen/:id/plushies', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const input = createSchema.parse(req.body);
    const p = await prisma.plushie.create({
      data: {
        koerbchenId: id,
        name: input.name,
        emoji: input.emoji ?? null,
        species: input.species ?? null,
        character: input.character ?? null,
        favorites: input.favorites ?? null,
        bio: input.bio ?? null,
        photo: input.photo ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    touch(id);
    return toDto(p);
  });

  app.patch('/api/koerbchen/:id/plushies/:plushieId', async (req) => {
    const { id, plushieId } = req.params as { id: string; plushieId: string };
    await requireMembership(req, id);
    await findPlushie(id, plushieId);
    const input = updateSchema.parse(req.body);
    const data: PlushieData = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.emoji !== undefined) data.emoji = input.emoji;
    if (input.species !== undefined) data.species = input.species;
    if (input.character !== undefined) data.character = input.character;
    if (input.favorites !== undefined) data.favorites = input.favorites;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.photo !== undefined) data.photo = input.photo;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    const p = await prisma.plushie.update({ where: { id: plushieId }, data });
    touch(id);
    return toDto(p);
  });

  app.delete('/api/koerbchen/:id/plushies/:plushieId', async (req) => {
    const { id, plushieId } = req.params as { id: string; plushieId: string };
    await requireMembership(req, id);
    await findPlushie(id, plushieId);
    await prisma.plushie.delete({ where: { id: plushieId } });
    touch(id);
    return { ok: true };
  });
}
