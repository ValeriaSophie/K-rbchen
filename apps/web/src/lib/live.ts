import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LiveEvent } from '@koerbchen/shared';

// Opens an SSE connection for the active Körbchen and invalidates the
// relevant TanStack Query caches when live events arrive, so every device
// refetches and stays in sync.
export function useLiveEvents(koerbchenId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!koerbchenId) return;
    const es = new EventSource(`/api/live/${koerbchenId}`);

    es.onmessage = (e: MessageEvent<string>) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(e.data) as LiveEvent;
      } catch {
        return;
      }
      const invalidate = (key: unknown[]) => qc.invalidateQueries({ queryKey: key });

      switch (event.type) {
        case 'drink.logged':
        case 'drink.goalReached':
          invalidate(['drink', 'today', koerbchenId]);
          break;
        case 'stars.updated':
          invalidate(['stars', koerbchenId]);
          break;
        case 'diaper.updated':
        case 'diaper.low':
          invalidate(['diaper', koerbchenId]);
          break;
        case 'change.logged':
        case 'change.reminder':
          invalidate(['change', koerbchenId]);
          break;
        case 'reward.updated':
          invalidate(['rewards', koerbchenId]);
          break;
        case 'redemption.updated':
          invalidate(['redemptions', koerbchenId]);
          break;
        case 'quickcall.received':
        case 'quickcall.acknowledged':
          invalidate(['quickcalls', koerbchenId]);
          break;
        case 'calendar.updated':
          invalidate(['calendar', koerbchenId]);
          break;
        case 'calendar.reminder':
          invalidate(['calendar', koerbchenId]);
          // surface a transient toast, decoupled from this hook
          window.dispatchEvent(new CustomEvent('koerbchen:reminder', { detail: event }));
          break;
        case 'koerbchen.updated':
          invalidate(['koerbchen', koerbchenId]);
          break;
        default:
          break;
      }
    };

    return () => es.close();
  }, [koerbchenId, qc]);
}
