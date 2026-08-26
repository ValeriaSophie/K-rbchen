import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';

describe('diaper & change routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('restocks diapers (caregiver only) and a change consumes one', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);

    const byPupp = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/diaper/restock`,
        payload: { count: 10 },
      }),
    );
    expect(byPupp.statusCode).toBe(403);

    const restock = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/diaper/restock`,
        payload: { count: 10 },
      }),
    );
    expect(restock.statusCode).toBe(200);
    expect(restock.json().count).toBe(10);

    const change = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/change`,
        payload: { note: 'frisch' },
      }),
    );
    expect(change.statusCode).toBe(200);
    expect(change.json().diaper.count).toBe(9);
    expect(change.json().change.lastChangeAt).toBeTruthy();
    await app.close();
  });

  it('never drops the diaper stock below zero', async () => {
    const app = await buildApp();
    const { koerbchenId, pCookie } = await setupPair(app);
    const change = await app.inject(
      authed(pCookie, { method: 'POST', url: `/api/koerbchen/${koerbchenId}/change`, payload: {} }),
    );
    expect(change.json().diaper.count).toBe(0);
    await app.close();
  });
});
