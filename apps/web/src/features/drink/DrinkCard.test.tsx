import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrinkCard } from './DrinkCard';

function okJson(body: unknown) {
  return { ok: true, status: 200, statusText: '', json: () => Promise.resolve(body) } as Response;
}

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const today = {
  goalMl: 1500,
  totalMl: 250,
  reachedGoal: false,
  logs: [{ id: '1', amountMl: 250, createdAt: new Date().toISOString(), userId: 'u1' }],
};
const afterLog = {
  ...today,
  totalMl: 500,
  logs: [{ id: '2', amountMl: 250, createdAt: new Date().toISOString(), userId: 'u1' }, ...today.logs],
};

describe('DrinkCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the current total and adds ml on a quick-add click', async () => {
    const fetchMock = vi.fn((_url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      return Promise.resolve(okJson(method === 'POST' ? afterLog : today));
    });
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DrinkCard koerbchenId="k1" userId="u1" />);

    expect(await screen.findByText('250')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+250' }));

    expect(await screen.findByText('500')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find((c) => (c[1]?.method ?? 'GET') === 'POST');
    expect(postCall?.[0]).toBe('/api/koerbchen/k1/drink');
    expect(postCall?.[1]?.body).toBe(JSON.stringify({ amountMl: 250 }));
  });
});
