import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useLiveEvents } from './live';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  url: string;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
}

describe('useLiveEvents', () => {
  it('invalidates the drink query when a drink.logged event arrives', () => {
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    renderHook(() => useLiveEvents('k1'), { wrapper });

    const es = FakeEventSource.instances.at(-1)!;
    expect(es.url).toBe('/api/live/k1');
    es.onmessage?.({
      data: JSON.stringify({ type: 'drink.logged', koerbchenId: 'k1', at: 'now' }),
    } as MessageEvent<string>);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['drink', 'today', 'k1'] });
  });

  it('raises a toast for a Ruf from the other person, but not for your own', () => {
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const toasts: unknown[] = [];
    const listener = (e: Event) => toasts.push((e as CustomEvent).detail);
    window.addEventListener('koerbchen:toast', listener);

    renderHook(() => useLiveEvents('k1', 'me'), { wrapper });
    const es = FakeEventSource.instances.at(-1)!;

    const call = (fromUserId: string, text: string) => ({
      type: 'quickcall.received',
      koerbchenId: 'k1',
      actorUserId: fromUserId,
      at: 'now',
      payload: { id: 'q1', fromUserId, fromDisplayName: 'Mia', text, emoji: null, acknowledgedAt: null, createdAt: 'now' },
    });

    es.onmessage?.({ data: JSON.stringify(call('them', 'Fläschchen bitte')) } as MessageEvent<string>);
    es.onmessage?.({ data: JSON.stringify(call('me', 'von mir')) } as MessageEvent<string>);

    window.removeEventListener('koerbchen:toast', listener);
    expect(toasts).toEqual([
      { kind: 'ruf', text: 'Fläschchen bitte', emoji: null, from: 'Mia' },
    ]);
  });
});
