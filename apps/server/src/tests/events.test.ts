import { describe, it, expect, vi } from 'vitest';
import { subscribe, emitLiveEvent } from '../lib/events';

describe('event bus', () => {
  it('delivers only to subscribers of the same Körbchen', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribe('K-A', a);
    const offB = subscribe('K-B', b);

    emitLiveEvent({ type: 'drink.logged', koerbchenId: 'K-A', at: new Date().toISOString() });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    offA();
    offB();
  });

  it('stops delivering after unsubscribe', () => {
    const a = vi.fn();
    const off = subscribe('K-A', a);
    off();
    emitLiveEvent({ type: 'drink.logged', koerbchenId: 'K-A', at: new Date().toISOString() });
    expect(a).not.toHaveBeenCalled();
  });
});
