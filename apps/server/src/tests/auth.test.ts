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
});
