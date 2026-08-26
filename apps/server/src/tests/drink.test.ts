import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { registerUser, authed } from './helpers';
import { getStarBalance } from '../services/stars';

async function setupKoerbchen(app: Awaited<ReturnType<typeof buildApp>>, goalMl: number) {
  const cgCookie = await registerUser(app, 'cg@b.de', 'Mama');
  const create = await app.inject(
    authed(cgCookie, {
      method: 'POST',
      url: '/api/koerbchen',
      payload: { name: 'Nest', role: 'caregiver' },
    }),
  );
  const k = create.json();
  await app.inject(
    authed(cgCookie, {
      method: 'PATCH',
      url: `/api/koerbchen/${k.id}/settings`,
      payload: { drinkGoalMl: goalMl },
    }),
  );
  const pCookie = await registerUser(app, 'pupp@b.de', 'Pupp');
  const join = await app.inject(
    authed(pCookie, {
      method: 'POST',
      url: '/api/koerbchen/join',
      payload: { inviteCode: k.inviteCode, role: 'pupp' },
    }),
  );
  const puppId = join.json().members.find((m: { role: string }) => m.role === 'pupp').userId;
  return { koerbchenId: k.id as string, cgCookie, pCookie, puppId: puppId as string };
}

describe('drink routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets a pupp log ml and rejects a caregiver logging', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupKoerbchen(app, 500);

    const cgLog = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/drink`,
        payload: { amountMl: 100 },
      }),
    );
    expect(cgLog.statusCode).toBe(403);

    const pLog = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/drink`,
        payload: { amountMl: 300 },
      }),
    );
    expect(pLog.statusCode).toBe(200);
    expect(pLog.json().totalMl).toBe(300);
    expect(pLog.json().reachedGoal).toBe(false);
    await app.close();
  });

  it('awards stars once when the goal is reached', async () => {
    const app = await buildApp();
    const { koerbchenId, pCookie, puppId } = await setupKoerbchen(app, 500);

    const log = (amountMl: number) =>
      app.inject(
        authed(pCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/drink`,
          payload: { amountMl },
        }),
      );

    await log(300);
    const second = await log(300); // total 600 >= 500
    expect(second.json().totalMl).toBe(600);
    expect(second.json().reachedGoal).toBe(true);
    expect(await getStarBalance(koerbchenId, puppId)).toBe(1);

    await log(100); // still same day — no extra star
    expect(await getStarBalance(koerbchenId, puppId)).toBe(1);
    await app.close();
  });

  it('lets a caregiver read a pupp today status', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie, puppId } = await setupKoerbchen(app, 500);
    await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/drink`,
        payload: { amountMl: 250 },
      }),
    );
    const view = await app.inject(
      authed(cgCookie, {
        method: 'GET',
        url: `/api/koerbchen/${koerbchenId}/drink/today?userId=${puppId}`,
      }),
    );
    expect(view.statusCode).toBe(200);
    expect(view.json().totalMl).toBe(250);
    await app.close();
  });
});
