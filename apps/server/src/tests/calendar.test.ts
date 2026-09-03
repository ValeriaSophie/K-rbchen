import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, registerUser, authed } from './helpers';

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

describe('calendar routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates an event for everyone that a pupp can see', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);

    const create = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/calendar`,
        payload: { title: 'Abendessen', startAt: tomorrow(), forEveryone: true },
      }),
    );
    expect(create.statusCode).toBe(200);
    expect(create.json().forEveryone).toBe(true);
    expect(create.json().attendees).toEqual([]);

    const list = await app.inject(
      authed(pCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/calendar` }),
    );
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].title).toBe('Abendessen');
    await app.close();
  });

  it('scopes an attendee-only event to its attendees', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    // second pupp joins
    const kdto = await app.inject(
      authed(cgCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}` }),
    );
    const inviteCode = kdto.json().inviteCode;
    const p2Cookie = await registerUser(app, 'pupp2@b.de', 'Pupp2');
    const join2 = await app.inject(
      authed(p2Cookie, {
        method: 'POST',
        url: '/api/koerbchen/join',
        payload: { inviteCode, role: 'pupp' },
      }),
    );
    const pupp2Id = join2
      .json()
      .members.find((m: { displayName: string }) => m.displayName === 'Pupp2').userId;

    const create = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/calendar`,
        payload: { title: 'Arzttermin', startAt: tomorrow(), attendeeUserIds: [pupp2Id] },
      }),
    );
    expect(create.statusCode).toBe(200);
    expect(create.json().attendees).toEqual([{ userId: pupp2Id, displayName: 'Pupp2' }]);

    // pupp2 (attendee) sees it; pupp1 does not
    const asP2 = await app.inject(
      authed(p2Cookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/calendar` }),
    );
    expect(asP2.json()).toHaveLength(1);
    const asP1 = await app.inject(
      authed(pCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/calendar` }),
    );
    expect(asP1.json()).toHaveLength(0);
    await app.close();
  });

  it('rejects an attendee who is not a member', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const res = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/calendar`,
        payload: { title: 'X', startAt: tomorrow(), attendeeUserIds: ['not-a-member'] },
      }),
    );
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects an end before the start and a series ending before it begins', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const post = (payload: Record<string, unknown>) =>
      app.inject(
        authed(cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/calendar`,
          payload: { title: 'X', forEveryone: true, ...payload },
        }),
      );

    // Picking 23:00–01:00 in the form yields both times on the same day, which
    // would otherwise store an occurrence of minus 22 hours.
    const backwards = await post({
      startAt: '2026-09-01T23:00:00.000Z',
      endAt: '2026-09-01T01:00:00.000Z',
    });
    expect(backwards.statusCode).toBe(400);

    const seriesEndsFirst = await post({
      startAt: '2026-09-01T10:00:00.000Z',
      recurrence: 'weekly',
      recurrenceEnd: '2026-08-01T10:00:00.000Z',
    });
    expect(seriesEndsFirst.statusCode).toBe(400);

    const ok = await post({
      startAt: '2026-09-01T10:00:00.000Z',
      endAt: '2026-09-01T11:00:00.000Z',
    });
    expect(ok.statusCode).toBe(200);
    await app.close();
  });

  it('lets only the creator or a caregiver edit', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    // second pupp joins
    const kdto = await app.inject(
      authed(cgCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}` }),
    );
    const p2Cookie = await registerUser(app, 'pupp2@b.de', 'Pupp2');
    await app.inject(
      authed(p2Cookie, {
        method: 'POST',
        url: '/api/koerbchen/join',
        payload: { inviteCode: kdto.json().inviteCode, role: 'pupp' },
      }),
    );

    // pupp1 creates
    const created = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/calendar`,
        payload: { title: 'Spielen', startAt: tomorrow(), forEveryone: true },
      }),
    );
    const eventId = created.json().id;

    const byP2 = await app.inject(
      authed(p2Cookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${koerbchenId}/calendar/${eventId}`,
        payload: { title: 'Hijack', startAt: tomorrow(), forEveryone: true },
      }),
    );
    expect(byP2.statusCode).toBe(403);

    const byCg = await app.inject(
      authed(cgCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${koerbchenId}/calendar/${eventId}`,
        payload: { title: 'Kuscheln', startAt: tomorrow(), forEveryone: true },
      }),
    );
    expect(byCg.statusCode).toBe(200);
    expect(byCg.json().title).toBe('Kuscheln');
    await app.close();
  });

  it('expands a weekly series into multiple occurrences over a window', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const start = new Date(Date.now() + 86_400_000).toISOString();
    const created = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/calendar`,
        payload: { title: 'Wochenritual', startAt: start, forEveryone: true, recurrence: 'weekly' },
      }),
    );
    const eventId = created.json().id;

    const from = new Date(Date.now()).toISOString();
    const to = new Date(Date.now() + 28 * 86_400_000).toISOString();
    const list = await app.inject(
      authed(cgCookie, {
        method: 'GET',
        url: `/api/koerbchen/${koerbchenId}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      }),
    );
    const events = list.json();
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.every((e: { id: string }) => e.id === eventId)).toBe(true);
    // distinct occurrence starts
    const starts = new Set(events.map((e: { occurrenceStart: string }) => e.occurrenceStart));
    expect(starts.size).toBe(events.length);
    await app.close();
  });
});
