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
      switch (event.type) {
        case 'drink.logged':
        case 'drink.goalReached':
          qc.invalidateQueries({ queryKey: ['drink', 'today', koerbchenId] });
          break;
        case 'stars.updated':
          qc.invalidateQueries({ queryKey: ['drink', 'today', koerbchenId] });
          break;
        case 'koerbchen.updated':
          qc.invalidateQueries({ queryKey: ['koerbchen', koerbchenId] });
          break;
        default:
          break;
      }
    };

    return () => es.close();
  }, [koerbchenId, qc]);
}
