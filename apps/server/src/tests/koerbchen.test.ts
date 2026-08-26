import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { registerUser, authed } from './helpers';

describe('koerbchen routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a Körbchen, lets a pupp join, and enforces caregiver-only settings', async () => {
    const app = await buildApp();
    const cgCookie = await registerUser(app, 'cg@b.de', 'Mama');

    const create = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: '/api/koerbchen',
        payload: { name: 'Nest', role: 'caregiver' },
      }),
    );
    expect(create.statusCode).toBe(200);
    const k = create.json();
    expect(k.inviteCode).toBeTruthy();
    expect(k.members).toHaveLength(1);
    expect(k.members[0].role).toBe('caregiver');

    const pCookie = await registerUser(app, 'pupp@b.de', 'Pupp');
    const join = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: '/api/koerbchen/join',
        payload: { inviteCode: k.inviteCode, role: 'pupp' },
      }),
    );
    expect(join.statusCode).toBe(200);
    expect(join.json().members).toHaveLength(2);

    const byPupp = await app.inject(
      authed(pCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${k.id}/settings`,
        payload: { drinkGoalMl: 2000 },
      }),
    );
    expect(byPupp.statusCode).toBe(403);

    const byCg = await app.inject(
      authed(cgCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${k.id}/settings`,
        payload: { drinkGoalMl: 2000 },
      }),
    );
    expect(byCg.statusCode).toBe(200);
    expect(byCg.json().drinkGoalMl).toBe(2000);
    await app.close();
  });

  it('returns 404 for an invalid invite code', async () => {
    const app = await buildApp();
    const cookie = await registerUser(app, 'x@b.de', 'X');
    const res = await app.inject(
      authed(cookie, {
        method: 'POST',
        url: '/api/koerbchen/join',
        payload: { inviteCode: 'NOPE99', role: 'pupp' },
      }),
    );
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
