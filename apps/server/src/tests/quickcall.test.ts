import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app';
import { resetDb } from './db';
import { setupPair, authed } from './helpers';

describe('quick-call routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('sends via a preset and acknowledges', async () => {
    const app = await buildApp();
    const { koerbchenId, cgCookie, pCookie } = await setupPair(app);

    const preset = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/quickcall/presets`,
        payload: { label: 'Hunger', message: 'Ich habe Hunger', emoji: '🍼' },
      }),
    );
    expect(preset.statusCode).toBe(200);
    const presetId = preset.json().id;

    const send = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/quickcall`,
        payload: { presetId },
      }),
    );
    expect(send.statusCode).toBe(200);
    expect(send.json().text).toBe('Ich habe Hunger');
    expect(send.json().emoji).toBe('🍼');
    expect(send.json().fromDisplayName).toBe('Pupp');
    const callId = send.json().id;

    const ack = await app.inject(
      authed(cgCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/quickcall/${callId}/ack`,
      }),
    );
    expect(ack.statusCode).toBe(200);
    expect(ack.json().acknowledgedAt).toBeTruthy();
    await app.close();
  });

  it('rejects an empty free-text call', async () => {
    const app = await buildApp();
    const { koerbchenId, pCookie } = await setupPair(app);
    const send = await app.inject(
      authed(pCookie, {
        method: 'POST',
        url: `/api/koerbchen/${koerbchenId}/quickcall`,
        payload: { text: '   ' },
      }),
    );
    expect(send.statusCode).toBe(400);
    await app.close();
  });
});
