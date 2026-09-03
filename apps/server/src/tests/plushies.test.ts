import { describe, it, expect, beforeEach } from 'vitest';
import type { PlushieDto } from '@koerbchen/shared';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';

// A tiny valid 1×1 PNG data URL.
const PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function listPlushies(
  app: Awaited<ReturnType<typeof buildApp>>,
  koerbchenId: string,
  cookie: string,
): Promise<PlushieDto[]> {
  const res = await app.inject(
    authed(cookie, { method: 'GET', url: `/api/koerbchen/${koerbchenId}/plushies` }),
  );
  return res.json();
}

describe('plushie (Steckbrief) routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets any member create a Steckbrief with fields + photo and lists it', async () => {
    const app = await buildApp();
    const { koerbchenId, pCookie } = await setupPair(app);

    const created = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/plushies`,
        payload: {
          name: 'Bruno',
          emoji: '🐻',
          species: 'Bär',
          character: 'schmusig, etwas frech',
          favorites: 'Honigbrote',
          bio: 'Mein ältester Freund.',
          photo: PHOTO,
        },
      }),
    );
    expect(created.statusCode).toBe(200);
    const p = created.json();
    expect(p.name).toBe('Bruno');
    expect(p.species).toBe('Bär');
    expect(p.character).toBe('schmusig, etwas frech');
    expect(p.favorites).toBe('Honigbrote');
    expect(p.photo).toBe(PHOTO);

    const list = await listPlushies(app, koerbchenId, pCookie);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Bruno');
    await app.close();
  });

  it('rejects a photo that is not an image data URL', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const res = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/plushies`,
        payload: { name: 'Hoppel', photo: 'nicht-ein-bild' },
      }),
    );
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects an oversized photo', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const huge = 'data:image/png;base64,' + 'A'.repeat(600_000);
    const res = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/plushies`,
        payload: { name: 'Riese', photo: huge },
      }),
    );
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('updates and deletes a Steckbrief', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie } = await setupPair(app);
    const id = (
      await app.inject(
        authed(cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${koerbchenId}/plushies`,
          payload: { name: 'Hoppel', species: 'Hase' },
        }),
      )
    ).json().id as string;

    const patched = await app.inject(
      authed(cgCookie, {
        method: 'PATCH',
        url: `/api/koerbchen/${koerbchenId}/plushies/${id}`,
        payload: { character: 'ruhig und weise' },
      }),
    );
    expect(patched.statusCode).toBe(200);
    expect(patched.json().character).toBe('ruhig und weise');
    expect(patched.json().species).toBe('Hase');

    const del = await app.inject(
      authed(cgCookie, {
        method: 'DELETE',
        url: `/api/koerbchen/${koerbchenId}/plushies/${id}`,
      }),
    );
    expect(del.statusCode).toBe(200);
    expect(await listPlushies(app, koerbchenId, cgCookie)).toHaveLength(0);
    await app.close();
  });

  it('rejects operating on a Steckbrief from another Körbchen', async () => {
    const app = await buildApp();
    const a = await setupPair(app);
    const id = (
      await app.inject(
        authed(a.cgCookie, {
          method: 'POST',
          url: `/api/koerbchen/${a.koerbchenId}/plushies`,
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
        url: `/api/koerbchen/${otherK.id}/plushies/${id}`,
        payload: { name: 'Geklaut' },
      }),
    );
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
