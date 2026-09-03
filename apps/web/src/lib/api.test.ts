import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from './api';

// Every mutation that sends no body used to go out announcing
// `Content-Type: application/json` anyway, and Fastify answers that with
// 400 "Body cannot be empty when content-type is set to 'application/json'".
// It broke logout, acknowledging a Ruf, redeeming a reward, resetting a bag and
// every delete in the app — none of which any test covered, because the tests
// mocked fetch and never looked at the headers.

function mockFetch(body: unknown = { ok: true }, status = 200) {
  const spy = vi.fn(async () => ({
    ok: status < 400,
    status,
    statusText: 'OK',
    json: async () => body,
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', spy);
  return spy as unknown as ReturnType<typeof vi.fn>;
}

const headersOf = (spy: ReturnType<typeof vi.fn>, call = 0) =>
  (spy.mock.calls[call][1] as RequestInit).headers as Record<string, string>;

const bodyOf = (spy: ReturnType<typeof vi.fn>, call = 0) =>
  (spy.mock.calls[call][1] as RequestInit | undefined)?.body;

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('api request headers', () => {
  // Each of these hits the server with no body at all.
  const bodiless: Array<[string, () => Promise<unknown>]> = [
    ['logout', () => api.logout()],
    ['deleteDiaperType', () => api.deleteDiaperType('k', 't')],
    ['deleteBag', () => api.deleteBag('k', 'b')],
    ['deleteBagItem', () => api.deleteBagItem('k', 'b', 'i')],
    ['resetBag', () => api.resetBag('k', 'b')],
    ['deletePlushie', () => api.deletePlushie('k', 'p')],
    ['deleteReward', () => api.deleteReward('k', 'r')],
    ['redeemReward', () => api.redeemReward('k', 'r')],
    ['deletePreset', () => api.deletePreset('k', 'p')],
    ['ackQuickCall', () => api.ackQuickCall('k', 'c')],
    ['deleteEvent', () => api.deleteEvent('k', 'e')],
  ];

  it.each(bodiless)('%s sends no Content-Type, because it sends no body', async (_name, call) => {
    const spy = mockFetch();
    await call();
    expect(bodyOf(spy)).toBeUndefined();
    expect(headersOf(spy)).not.toHaveProperty('Content-Type');
  });

  it('a GET sends no Content-Type either', async () => {
    const spy = mockFetch({ user: null, membership: null });
    await api.me();
    expect(headersOf(spy)).not.toHaveProperty('Content-Type');
  });

  it('a request that does carry a body still declares JSON', async () => {
    const spy = mockFetch();
    await api.logDrink('k', 250);
    expect(headersOf(spy)).toMatchObject({ 'Content-Type': 'application/json' });
    expect(bodyOf(spy)).toBe(JSON.stringify({ amountMl: 250 }));
  });

  it('every request carries the session cookie', async () => {
    const spy = mockFetch();
    await api.logout();
    expect((spy.mock.calls[0][1] as RequestInit).credentials).toBe('same-origin');
  });

  it('surfaces the server’s German message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Ungültiges Datum: startAt' } }),
      })) as unknown as typeof fetch,
    );
    await expect(api.logDrink('k', 1)).rejects.toThrow(ApiError);
    await expect(api.logDrink('k', 1)).rejects.toThrow('Ungültiges Datum: startAt');
  });
});
