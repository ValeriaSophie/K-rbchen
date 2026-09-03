import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { CalendarEventDto, Recurrence } from '@koerbchen/shared';
import { prisma } from '../lib/prisma';
import { requireMembership } from '../plugins/auth';
import { emitLiveEvent } from '../lib/events';
import { badRequest, notFound, forbidden } from '../lib/errors';
import { expandOccurrences } from '../services/recurrence';

const recurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);
const eventInputSchema = z.object({
  title: z.string().min(1).max(120),
  note: z.string().max(1000).nullish(),
  startAt: z.string(),
  endAt: z.string().nullish(),
  allDay: z.boolean().optional(),
  forEveryone: z.boolean().optional(),
  attendeeUserIds: z.array(z.string()).optional(),
  recurrence: recurrenceSchema.optional(),
  recurrenceEnd: z.string().nullish(),
  reminderMinutes: z.number().int().min(0).max(43200).nullish(),
});

type EventWithAttendees = {
  id: string;
  createdBy: string;
  title: string;
  note: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  forEveryone: boolean;
  recurrence: string;
  recurrenceEnd: Date | null;
  reminderMinutes: number | null;
  attendees: Array<{ userId: string }>;
};

function parseDate(value: string, field: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`Ungültiges Datum: ${field}`);
  return d;
}

type EventInput = z.infer<typeof eventInputSchema>;

// Parses the three date fields together so an event can never be stored with an
// end before its start (which would yield occurrences of negative duration) or
// with a series that ends before it begins.
function parseEventDates(input: EventInput) {
  const startAt = parseDate(input.startAt, 'startAt');
  const endAt = input.endAt ? parseDate(input.endAt, 'endAt') : null;
  if (endAt && endAt.getTime() < startAt.getTime()) {
    throw badRequest('Das Ende darf nicht vor dem Beginn liegen');
  }
  const recurrenceEnd = input.recurrenceEnd
    ? parseDate(input.recurrenceEnd, 'recurrenceEnd')
    : null;
  if (recurrenceEnd && recurrenceEnd.getTime() < startAt.getTime()) {
    throw badRequest('Das Ende der Wiederholung darf nicht vor dem Beginn liegen');
  }
  return { startAt, endAt, recurrenceEnd };
}

function startOfDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function nameMap(koerbchenId: string): Promise<Map<string, string>> {
  const memberships = await prisma.membership.findMany({
    where: { koerbchenId },
    include: { user: true },
  });
  return new Map(memberships.map((m) => [m.userId, m.user.displayName]));
}

async function validateAttendees(koerbchenId: string, userIds: string[]): Promise<void> {
  const members = await prisma.membership.findMany({
    where: { koerbchenId, userId: { in: userIds } },
    select: { userId: true },
  });
  if (members.length !== new Set(userIds).size) {
    throw badRequest('Mindestens ein Teilnehmer ist kein Mitglied dieses Körbchens');
  }
}

function toDtoBase(
  e: EventWithAttendees,
  names: Map<string, string>,
): Omit<CalendarEventDto, 'occurrenceStart' | 'occurrenceEnd'> {
  return {
    id: e.id,
    title: e.title,
    note: e.note,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt ? e.endAt.toISOString() : null,
    allDay: e.allDay,
    forEveryone: e.forEveryone,
    recurrence: e.recurrence as Recurrence,
    recurrenceEnd: e.recurrenceEnd ? e.recurrenceEnd.toISOString() : null,
    reminderMinutes: e.reminderMinutes,
    createdBy: e.createdBy,
    attendees: e.forEveryone
      ? []
      : e.attendees.map((a) => ({ userId: a.userId, displayName: names.get(a.userId) ?? 'Unbekannt' })),
  };
}

function canSee(e: EventWithAttendees, userId: string, role: string): boolean {
  if (role === 'caregiver') return true;
  if (e.forEveryone) return true;
  if (e.createdBy === userId) return true;
  return e.attendees.some((a) => a.userId === userId);
}

export async function calendarRoutes(app: FastifyInstance) {
  app.get('/api/koerbchen/:id/calendar', async (req) => {
    const { id } = req.params as { id: string };
    const { user, membership } = await requireMembership(req, id);
    const q = req.query as { from?: string; to?: string };
    const from = q.from ? parseDate(q.from, 'from') : startOfDay();
    const to = q.to ? parseDate(q.to, 'to') : new Date(from.getTime() + 42 * 86_400_000);

    const events = (await prisma.calendarEvent.findMany({
      where: { koerbchenId: id },
      include: { attendees: true },
    })) as EventWithAttendees[];
    const names = await nameMap(id);

    const dtos: CalendarEventDto[] = [];
    for (const e of events) {
      if (!canSee(e, user.id, membership.role)) continue;
      const occ = expandOccurrences(e, from, to);
      if (occ.length === 0) continue;
      const base = toDtoBase(e, names);
      for (const o of occ) {
        dtos.push({
          ...base,
          occurrenceStart: o.start.toISOString(),
          occurrenceEnd: o.end ? o.end.toISOString() : null,
        });
      }
    }
    dtos.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
    return dtos;
  });

  app.post('/api/koerbchen/:id/calendar', async (req) => {
    const { id } = req.params as { id: string };
    const { user } = await requireMembership(req, id);
    const input = eventInputSchema.parse(req.body);

    const forEveryone = input.forEveryone ?? false;
    const attendeeUserIds = input.attendeeUserIds ?? [];
    if (!forEveryone && attendeeUserIds.length === 0) {
      throw badRequest('Bitte „Alle" wählen oder mindestens einen Teilnehmer angeben');
    }
    if (!forEveryone) await validateAttendees(id, attendeeUserIds);
    const dates = parseEventDates(input);

    const created = (await prisma.calendarEvent.create({
      data: {
        koerbchenId: id,
        createdBy: user.id,
        title: input.title,
        note: input.note ?? null,
        ...dates,
        allDay: input.allDay ?? false,
        forEveryone,
        recurrence: input.recurrence ?? 'none',
        reminderMinutes: input.reminderMinutes ?? null,
        attendees: forEveryone
          ? undefined
          : { create: attendeeUserIds.map((userId) => ({ userId })) },
      },
      include: { attendees: true },
    })) as EventWithAttendees;

    emitLiveEvent({
      type: 'calendar.updated',
      koerbchenId: id,
      actorUserId: user.id,
      at: new Date().toISOString(),
    });

    const names = await nameMap(id);
    const base = toDtoBase(created, names);
    return { ...base, occurrenceStart: base.startAt, occurrenceEnd: base.endAt };
  });

  app.patch('/api/koerbchen/:id/calendar/:eventId', async (req) => {
    const { id, eventId } = req.params as { id: string; eventId: string };
    const { user, membership } = await requireMembership(req, id);
    const existing = await prisma.calendarEvent.findFirst({ where: { id: eventId, koerbchenId: id } });
    if (!existing) throw notFound('Termin nicht gefunden');
    if (existing.createdBy !== user.id && membership.role !== 'caregiver') {
      throw forbidden('Nur der Ersteller oder ein Caregiver darf bearbeiten');
    }
    const input = eventInputSchema.parse(req.body);
    const forEveryone = input.forEveryone ?? false;
    const attendeeUserIds = input.attendeeUserIds ?? [];
    if (!forEveryone && attendeeUserIds.length === 0) {
      throw badRequest('Bitte „Alle" wählen oder mindestens einen Teilnehmer angeben');
    }
    if (!forEveryone) await validateAttendees(id, attendeeUserIds);
    const dates = parseEventDates(input);

    // Replacing the attendee list and updating the event must both land, or the
    // event would be left with its old attendees dropped.
    const updated = (await prisma.$transaction(async (tx) => {
      await tx.calendarAttendee.deleteMany({ where: { eventId } });
      return tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: input.title,
          note: input.note ?? null,
          ...dates,
          allDay: input.allDay ?? false,
          forEveryone,
          recurrence: input.recurrence ?? 'none',
          reminderMinutes: input.reminderMinutes ?? null,
          reminderSentFor: null,
          attendees: forEveryone
            ? undefined
            : { create: attendeeUserIds.map((userId) => ({ userId })) },
        },
        include: { attendees: true },
      });
    })) as EventWithAttendees;

    emitLiveEvent({
      type: 'calendar.updated',
      koerbchenId: id,
      actorUserId: user.id,
      at: new Date().toISOString(),
    });

    const names = await nameMap(id);
    const base = toDtoBase(updated, names);
    return { ...base, occurrenceStart: base.startAt, occurrenceEnd: base.endAt };
  });

  app.delete('/api/koerbchen/:id/calendar/:eventId', async (req) => {
    const { id, eventId } = req.params as { id: string; eventId: string };
    const { user, membership } = await requireMembership(req, id);
    const existing = await prisma.calendarEvent.findFirst({ where: { id: eventId, koerbchenId: id } });
    if (!existing) throw notFound('Termin nicht gefunden');
    if (existing.createdBy !== user.id && membership.role !== 'caregiver') {
      throw forbidden('Nur der Ersteller oder ein Caregiver darf löschen');
    }
    await prisma.calendarEvent.delete({ where: { id: eventId } });
    emitLiveEvent({
      type: 'calendar.updated',
      koerbchenId: id,
      actorUserId: user.id,
      at: new Date().toISOString(),
    });
    return { ok: true };
  });
}
