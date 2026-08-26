import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { QuickCallPresetDto, QuickCallDto } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { emitLiveEvent } from '../lib/events';
import { badRequest, notFound } from '../lib/errors';

const presetSchema = z.object({
  label: z.string().min(1).max(40),
  message: z.string().min(1).max(200),
  emoji: z.string().max(8).nullish(),
  sortOrder: z.number().int().optional(),
});
const sendSchema = z.object({
  presetId: z.string().optional(),
  text: z.string().max(200).optional(),
  emoji: z.string().max(8).nullish(),
});

type PresetRow = {
  id: string;
  label: string;
  message: string;
  emoji: string | null;
  sortOrder: number;
};
type CallRow = {
  id: string;
  fromUserId: string;
  text: string;
  emoji: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  from: { displayName: string };
};

function presetDto(p: PresetRow): QuickCallPresetDto {
  return { id: p.id, label: p.label, message: p.message, emoji: p.emoji, sortOrder: p.sortOrder };
}

function callDto(c: CallRow): QuickCallDto {
  return {
    id: c.id,
    fromUserId: c.fromUserId,
    fromDisplayName: c.from.displayName,
    text: c.text,
    emoji: c.emoji,
    createdAt: c.createdAt.toISOString(),
    acknowledgedAt: c.acknowledgedAt ? c.acknowledgedAt.toISOString() : null,
  };
}

export async function quickCallRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/quickcall/presets', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const presets = await prisma.quickCallPreset.findMany({
      where: { koerbchenId: id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return presets.map(presetDto);
  });

  app.post('/api/koerbchen/:id/quickcall/presets', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id, 'caregiver');
    const input = presetSchema.parse(req.body);
    const p = await prisma.quickCallPreset.create({
      data: {
        koerbchenId: id,
        label: input.label,
        message: input.message,
        emoji: input.emoji ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return presetDto(p);
  });

  app.delete('/api/koerbchen/:id/quickcall/presets/:presetId', async (req) => {
    const { id, presetId } = req.params as { id: string; presetId: string };
    await requireMembership(req, id, 'caregiver');
    const p = await prisma.quickCallPreset.findFirst({ where: { id: presetId, koerbchenId: id } });
    if (!p) throw notFound('Preset nicht gefunden');
    await prisma.quickCallPreset.delete({ where: { id: presetId } });
    return { ok: true };
  });

  // Send a quick-call: any member. Uses a preset's message or free text.
  app.post('/api/koerbchen/:id/quickcall', async (req) => {
    const { id } = req.params as { id: string };
    const { user } = await requireMembership(req, id);
    const input = sendSchema.parse(req.body);

    let text = input.text?.trim() ?? '';
    let emoji = input.emoji ?? null;
    if (input.presetId) {
      const preset = await prisma.quickCallPreset.findFirst({
        where: { id: input.presetId, koerbchenId: id },
      });
      if (!preset) throw notFound('Preset nicht gefunden');
      text = preset.message;
      emoji = preset.emoji;
    }
    if (!text) throw badRequest('Nachricht darf nicht leer sein');

    const created = await prisma.quickCall.create({
      data: {
        koerbchenId: id,
        fromUserId: user.id,
        presetId: input.presetId ?? null,
        text,
        emoji,
      },
      include: { from: true },
    });
    const dto = callDto(created);
    emitLiveEvent({
      type: 'quickcall.received',
      koerbchenId: id,
      actorUserId: user.id,
      at: dto.createdAt,
      payload: dto,
    });
    return dto;
  });

  app.get('/api/koerbchen/:id/quickcall', async (req) => {
    const { id } = req.params as { id: string };
    await requireMembership(req, id);
    const calls = await prisma.quickCall.findMany({
      where: { koerbchenId: id },
      include: { from: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return calls.map(callDto);
  });

  app.post('/api/koerbchen/:id/quickcall/:callId/ack', async (req) => {
    const { id, callId } = req.params as { id: string; callId: string };
    const { user } = await requireMembership(req, id);
    const call = await prisma.quickCall.findFirst({ where: { id: callId, koerbchenId: id } });
    if (!call) throw notFound('Kurzruf nicht gefunden');
    const updated = await prisma.quickCall.update({
      where: { id: callId },
      data: { acknowledgedAt: new Date(), acknowledgedBy: user.id },
      include: { from: true },
    });
    const dto = callDto(updated);
    emitLiveEvent({
      type: 'quickcall.acknowledged',
      koerbchenId: id,
      actorUserId: user.id,
      at: new Date().toISOString(),
      payload: dto,
    });
    return dto;
  });
}
