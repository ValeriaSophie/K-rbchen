import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { cookieHeader } from './helpers';

describe('auth routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('registers, sets a session, and returns me', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'a@b.de', password: 'passwort123', displayName: 'Ann' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('a@b.de');
    expect(res.json().membership).toBeNull();

    const cookie = cookieHeader(res);
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.displayName).toBe('Ann');
    await app.close();
  });

  it('rejects a duplicate email with 409', async () => {
    const app = await buildApp();
    const payload = { email: 'a@b.de', password: 'passwort123', displayName: 'Ann' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const dup = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...payload, displayName: 'Ann2' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('conflict');
    await app.close();
  });

  it('rejects a short password with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'a@b.de', password: 'short', displayName: 'Ann' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('validation');
    await app.close();
  });

  it('rejects a wrong password on login with 401', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'a@b.de', password: 'passwort123', displayName: 'Ann' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'a@b.de', password: 'falsch' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 for me without a cookie', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('rate-limits repeated login attempts with a 429, not a 500', async () => {
    const app = await buildApp();
    const attempt = () =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'niemand@example.de', password: 'falsch' },
      });

    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await attempt()).statusCode);

    expect(codes.slice(0, 10)).toEqual(Array(10).fill(401));
    const blocked = codes[10];
    expect(blocked).toBe(429);

    const body = (await attempt()).json();
    expect(body.error.code).toBe('rate_limited');
    await app.close();
  });

  it('treats an e-mail as the same account regardless of casing and padding', async () => {
    const app = await buildApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'Anna@Example.de', password: 'passwort123', displayName: 'Anna' },
    });
    expect(registered.statusCode).toBe(200);
    expect(registered.json().user.email).toBe('anna@example.de');

    // The same person typing their address the way they remember it.
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: '  ANNA@example.de ', password: 'passwort123' },
    });
    expect(login.statusCode).toBe(200);

    // …and no second account can shadow the first.
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'anna@EXAMPLE.de', password: 'passwort123', displayName: 'Anna2' },
    });
    expect(duplicate.statusCode).toBe(409);
    await app.close();
  });
});
