import { prisma } from '../lib/prisma';
import { emitLiveEvent } from '../lib/events';
import { expandOccurrences } from './recurrence';

const CHECK_INTERVAL_MS = 60_000;

// One reminder pass: for every event with a reminder set, find its next
// occurrence and, if we're inside the lead window and haven't reminded for that
// occurrence yet, emit a `calendar.reminder` live event (idempotent per
// occurrence via `reminderSentFor`).
export async function runReminderTick(now = new Date()): Promise<void> {
  const events = await prisma.calendarEvent.findMany({
    where: { reminderMinutes: { not: null } },
  });

  for (const e of events) {
    if (e.reminderMinutes == null) continue;
    const leadMs = e.reminderMinutes * 60_000;
    const to = new Date(now.getTime() + leadMs + CHECK_INTERVAL_MS);
    const [next] = expandOccurrences(
      { startAt: e.startAt, endAt: e.endAt, recurrence: e.recurrence, recurrenceEnd: e.recurrenceEnd },
      now,
      to,
    );
    if (!next) continue;

    const inWindow =
      now.getTime() >= next.start.getTime() - leadMs && now.getTime() < next.start.getTime();
    const alreadySent =
      e.reminderSentFor != null && e.reminderSentFor.getTime() === next.start.getTime();
    if (!inWindow || alreadySent) continue;

    await prisma.calendarEvent.update({
      where: { id: e.id },
      data: { reminderSentFor: next.start },
    });
    emitLiveEvent({
      type: 'calendar.reminder',
      koerbchenId: e.koerbchenId,
      at: now.toISOString(),
      payload: { title: e.title, occurrenceStart: next.start.toISOString(), eventId: e.id },
    });
  }
}

// Starts the periodic reminder scheduler. Returns a stop function.
export function startReminderScheduler(): () => void {
  const timer = setInterval(() => {
    runReminderTick().catch((err) => console.error('reminder tick failed', err));
  }, CHECK_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  return () => clearInterval(timer);
}
