import { describe, it, expect, beforeEach } from 'vitest';
import type { LiveEvent } from '@koerbchen/shared';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair } from './helpers';
import { prisma } from '../lib/prisma';
import { subscribe } from '../lib/events';
import { runReminderTick } from '../services/reminders';

describe('runReminderTick', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('emits a reminder inside the lead window, exactly once', async () => {
    const app = await buildApp();
    const { koerbchenId, puppId } = await setupPair(app);
    const now = new Date();

    await prisma.calendarEvent.create({
      data: {
        koerbchenId,
        createdBy: puppId,
        title: 'Fläschchen',
        startAt: new Date(now.getTime() + 3 * 60_000), // 3 min ahead
        forEveryone: true,
        reminderMinutes: 10, // window: start-10min .. start → now is inside
      },
    });

    const received: LiveEvent[] = [];
    const off = subscribe(koerbchenId, (e) => received.push(e));

    await runReminderTick(now);
    await runReminderTick(now); // idempotent second pass

    off();
    const reminders = received.filter((e) => e.type === 'calendar.reminder');
    expect(reminders).toHaveLength(1);
    expect((reminders[0].payload as { title: string }).title).toBe('Fläschchen');
    await app.close();
  });

  it('does not emit before the lead window', async () => {
    const app = await buildApp();
    const { koerbchenId, puppId } = await setupPair(app);
    const now = new Date();

    await prisma.calendarEvent.create({
      data: {
        koerbchenId,
        createdBy: puppId,
        title: 'Später',
        startAt: new Date(now.getTime() + 60 * 60_000), // 60 min ahead
        forEveryone: true,
        reminderMinutes: 10, // window opens only 50 min from now
      },
    });

    const received: LiveEvent[] = [];
    const off = subscribe(koerbchenId, (e) => received.push(e));
    await runReminderTick(now);
    off();

    expect(received.filter((e) => e.type === 'calendar.reminder')).toHaveLength(0);
    await app.close();
  });
});
