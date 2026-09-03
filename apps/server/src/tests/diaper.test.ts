import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';

async function createType(
  app: Awaited<ReturnType<typeof buildApp>>,
  koerbchenId: string,
  cgCookie: string,
  payload: Record<string, unknown>,
) {
  const res = await app.inject(
    authed(cgCookie, {
      method: 'POST',
      url: `/api/koerbchen/${koerbchenId}/diaper/types`,
      payload,
    }),
  );
  return res;
}

describe('diaper types & changes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets a caregiver create diaper types and lists them; a pupp cannot create', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);

    const byPupp = await createType(app, koerbchenId, pCookie, { name: 'Nacht', emoji: '🌙' });
    expect(byPupp.statusCode).toBe(403);

    const created = await createType(app, koerbchenId, cgCookie, {
      name: 'Nacht',
      emoji: '🌙',
      note: 'nur nachts',
    });
    expect(created.statusCode).toBe(200);
    const type = created.json();
    expect(type.name).toBe('Nacht');
    expect(type.emoji).toBe('🌙');
    expect(type.note).toBe('nur nachts');
    expect(type.count).toBe(0);

    const list = await app.inject(
      authed(pCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/diaper` }),
    );
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].name).toBe('Nacht');
    await app.close();
  });

  it('restocks a type (caregiver only) and a change consumes one of that type', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    const type = (await createType(app, koerbchenId, cgCookie, { name: 'Tag' })).json();

    const restockUrl = `/api/koerbchen/${koerbchenId}/diaper/types/${type.id}/restock`;
    const byPupp = await app.inject(
      authed(pCookie, { method: 'POST', url: restockUrl, payload: { count: 10 } }),
    );
    expect(byPupp.statusCode).toBe(403);

    const restock = await app.inject(
      authed(cgCookie, { method: 'POST', url: restockUrl, payload: { count: 10 } }),
    );
    expect(restock.statusCode).toBe(200);
    expect(restock.json().count).toBe(10);

    const change = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/change`,
        payload: { diaperTypeId: type.id, note: 'frisch' },
      }),
    );
    expect(change.statusCode).toBe(200);
    expect(change.json().change.lastChangeAt).toBeTruthy();
    const consumed = change.json().diaper.find((t: { id: string }) => t.id === type.id);
    expect(consumed.count).toBe(9);
    await app.close();
  });

  it('never drops a type stock below zero', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    const type = (await createType(app, koerbchenId, cgCookie, { name: 'Tag' })).json();

    const change = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/change`,
        payload: { diaperTypeId: type.id },
      }),
    );
    const consumed = change.json().diaper.find((t: { id: string }) => t.id === type.id);
    expect(consumed.count).toBe(0);
    await app.close();
  });

  it('flags a type as low at or below the threshold and clears it above', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    // default diaperLowThreshold is 5
    const type = (await createType(app, koerbchenId, cgCookie, { name: 'Tag' })).json();
    expect(type.lowThreshold).toBe(5);
    expect(type.isLow).toBe(true); // 0 <= 5

    const restocked = (
      await app.inject(
        authed(cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/diaper/types/${type.id}/restock`,
          payload: { count: 10 },
        }),
      )
    ).json();
    expect(restocked.isLow).toBe(false); // 10 > 5
    await app.close();
  });

  it('updates and deletes a type (caregiver only)', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    const type = (await createType(app, koerbchenId, cgCookie, { name: 'Alt', emoji: '🙂' })).json();

    const typeUrl = `/api/koerbchen/${koerbchenId}/diaper/types/${type.id}`;
    const patched = await app.inject(
      authed(cgCookie, { method: 'PATCH', url: typeUrl, payload: { name: 'Neu', emoji: '🌊' } }),
    );
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Neu');
    expect(patched.json().emoji).toBe('🌊');

    const byPupp = await app.inject(authed(pCookie, { method: 'DELETE', url: typeUrl }));
    expect(byPupp.statusCode).toBe(403);

    const del = await app.inject(authed(cgCookie, { method: 'DELETE', url: typeUrl }));
    expect(del.statusCode).toBe(200);

    const list = (
      await app.inject(authed(cgCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/diaper` }))
    ).json();
    expect(list).toHaveLength(0);
    await app.close();
  });

  it('marks a retired type inactive and refuses to log a change against it', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    const type = (await createType(app, koerbchenId, cgCookie, { name: 'Alte Marke' })).json();
    expect(type.active).toBe(true);

    const retired = await app.inject(
      authed(cgCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${koerbchenId}/diaper/types/${type.id}`,
        payload: { active: false },
      }),
    );
    expect(retired.statusCode).toBe(200);
    expect(retired.json().active).toBe(false);

    // Still listed — the caregiver keeps its stock and can bring it back — but
    // no longer usable for a change.
    const list = await app.inject(
      authed(pCookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/diaper` }),
    );
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].active).toBe(false);

    const change = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/change`,
        payload: { diaperTypeId: type.id },
      }),
    );
    expect(change.statusCode).toBe(400);
    await app.close();
  });

  it('rejects operating on a type from another Körbchen', async () => {
    const app = await buildApp();
    const a = await setupPair(app);
    const type = (await createType(app, a.koerbchenId, a.cgCookie, { name: 'Tag' })).json();

    // A second, unrelated Körbchen with its own caregiver.
    const otherCg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'other@b.de', password: 'passwort123', displayName: 'Other' },
    });
    const otherCookie = `sid=${otherCg.cookies.find((c) => c.name === 'sid')!.value}`;
    const otherK = (
      await app.inject(
        authed(otherCookie, {
          method: 'POST',
          url: '/api/koerbchen',
          payload: { name: 'Andere', role: 'caregiver' },
        }),
      )
    ).json();

    const res = await app.inject(
      authed(otherCookie, {
        method: 'POST',
        url: `/api/koerbchen/${otherK.id}/diaper/types/${type.id}/restock`,
        payload: { count: 5 },
      }),
    );
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
