import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';
import { Providers } from './app/providers';

function okJson(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: () => Promise.resolve(body),
  } as Response;
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the auth page when logged out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(okJson(401, { error: { code: 'unauthorized', message: 'x' } })),
      ),
    );
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(await screen.findByRole('heading', { name: 'KÖRBCHEN' })).toBeInTheDocument();
    expect(screen.getByText('E-Mail')).toBeInTheDocument();
  });

  it('shows create-or-join when logged in without a membership', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          okJson(200, {
            user: { id: 'u1', email: 'a@b.de', displayName: 'Ann' },
            membership: null,
          }),
        ),
      ),
    );
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(await screen.findByText('Willkommen!')).toBeInTheDocument();
  });
});
