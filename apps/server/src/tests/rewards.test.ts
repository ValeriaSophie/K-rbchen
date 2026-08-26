import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';
import { getStarBalance } from '../services/stars';

describe('rewards & stars routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('runs the full redeem → approve flow and deducts stars once', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie, puppId } = await setupPair(app);

    // caregiver grants the pupp 5 stars
    const grant = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/stars/grant`,
        payload: { userId: puppId, delta: 5 },
      }),
    );
    expect(grant.statusCode).toBe(200);
    expect(grant.json().balance).toBe(5);

    // caregiver creates a reward costing 3
    const reward = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/rewards`,
        payload: { title: 'Eis', costStars: 3 },
      }),
    );
    const rewardId = reward.json().id;

    // pupp requests it
    const redeem = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/rewards/${rewardId}/redeem`,
      }),
    );
    expect(redeem.statusCode).toBe(200);
    expect(redeem.json().status).toBe('requested');
    const redemptionId = redeem.json().id;
    // not deducted yet
    expect(await getStarBalance(koerbchenId, puppId)).toBe(5);

    // caregiver approves → stars deducted
    const decide = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/redemptions/${redemptionId}/decide`,
        payload: { approve: true },
      }),
    );
    expect(decide.statusCode).toBe(200);
    expect(decide.json().status).toBe('approved');
    expect(await getStarBalance(koerbchenId, puppId)).toBe(2);

    // deciding again is rejected
    const again = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/redemptions/${redemptionId}/decide`,
        payload: { approve: true },
      }),
    );
    expect(again.statusCode).toBe(400);
    await app.close();
  });

  it('rejects redeeming without enough stars', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);
    const reward = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/rewards`,
        payload: { title: 'Kino', costStars: 10 },
      }),
    );
    const res = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/rewards/${reward.json().id}/redeem`,
      }),
    );
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
