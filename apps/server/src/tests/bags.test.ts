import { describe, it, expect, beforeEach } from 'vitest';
import type { BagDto } from '@koerbchen/shared';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';

async function listBags(
  app: Awaited<ReturnType<typeof buildApp>>,
  koerbchenId: string,
  cookie: string,
): Promise<BagDto[]> {
  const res = await app.inject(
    authed(cookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/bags` }),
  );
  return res.json();
}

describe('bag & packing-list routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('seeds a Schwimm- and Wickeltasche when a Körbchen is created', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);

    const bags = await listBags(app, koerbchenId, cgCookie);
    const names = bags.map((b) => b.name);
    expect(names).toContain('Schwimmtasche');
    expect(names).toContain('Wickeltasche');
    await app.close();
  });

  it('lets any member add a bag, plan items, tick them off, and reset', async () => {
    const app = await buildApp();
    const { koerbchenId, pCookie } = await setupPair(app);

    // A pupp (non-caregiver) may create a bag.
    const created = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/bags`,
        payload: { name: 'Reisetasche', emoji: '🧳' },
      }),
    );
    expect(created.statusCode).toBe(200);
    const bagId = created.json().id as string;

    const addItem = (payload: Record<string, unknown>) =>
      app.inject(
        authed(pCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/bags/${bagId}/items`,
          payload,
        }),
      );
    await addItem({ name: 'Handtuch', quantity: 2, note: 'im Seitenfach' });
    const second = await addItem({ name: 'Sonnencreme' });
    expect(second.statusCode).toBe(200);

    let bag = (await listBags(app, koerbchenId, pCookie)).find((b) => b.id === bagId)!;
    expect(bag.totalCount).toBe(2);
    expect(bag.packedCount).toBe(0);
    const towel = bag.items.find((i) => i.name === 'Handtuch')!;
    expect(towel.quantity).toBe(2);
    expect(towel.note).toBe('im Seitenfach');
    expect(towel.packed).toBe(false);

    // Tick the towel as packed.
    const packed = await app.inject(
      authed(pCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${koerbchenId}/bags/${bagId}/items/${towel.id}`,
        payload: { packed: true },
      }),
    );
    expect(packed.statusCode).toBe(200);
    bag = (await listBags(app, koerbchenId, pCookie)).find((b) => b.id === bagId)!;
    expect(bag.packedCount).toBe(1);

    // Reset unpacks everything for the next trip.
    const reset = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/bags/${bagId}/reset`,
      }),
    );
    expect(reset.statusCode).toBe(200);
    bag = (await listBags(app, koerbchenId, pCookie)).find((b) => b.id === bagId)!;
    expect(bag.packedCount).toBe(0);
    expect(bag.items.every((i) => !i.packed)).toBe(true);
    await app.close();
  });

  it('deletes an item and a whole bag', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const bagId = (
      await app.inject(
        authed(cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/bags`,
          payload: { name: 'Weg' },
        }),
      )
    ).json().id as string;
    const itemId = (
      await app.inject(
        authed(cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/bags/${bagId}/items`,
          payload: { name: 'Ding' },
        }),
      )
    ).json().id as string;

    const delItem = await app.inject(
      authed(cgCookie, {
        method: 'DELETE',
        url: `/api/koerbchen/${koerbchenId}/bags/${bagId}/items/${itemId}`,
      }),
    );
    expect(delItem.statusCode).toBe(200);
    let bag = (await listBags(app, koerbchenId, cgCookie)).find((b) => b.id === bagId)!;
    expect(bag.totalCount).toBe(0);

    const delBag = await app.inject(
      authed(cgCookie, { method: 'DELETE', url: `/api/koerbchen/${koerbchenId}/bags/${bagId}` }),
    );
    expect(delBag.statusCode).toBe(200);
    const gone = (await listBags(app, koerbchenId, cgCookie)).find((b) => b.id === bagId);
    expect(gone).toBeUndefined();
    await app.close();
  });

  it('rejects operating on a bag from another Körbchen', async () => {
    const app = await buildApp();
    const a = await setupPair(app);
    const bagId = (
      await app.inject(
        authed(a.cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${a.koerbchenId}/bags`,
          payload: { name: 'Geheim' },
        }),
      )
    ).json().id as string;

    const otherReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'other@b.de', password: 'passwort123', displayName: 'Other' },
    });
    const otherCookie = `sid=${otherReg.cookies.find((c) => c.name === 'sid')!.value}`;
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
        method: 'PATCH',
        url: `/api/koerbchen/${otherK.id}/bags/${bagId}`,
        payload: { name: 'Geklaut' },
      }),
    );
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
