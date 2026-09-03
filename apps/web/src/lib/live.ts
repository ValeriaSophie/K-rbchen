import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LiveEvent, QuickCallDto } from '@koerbchen/shared';
import { qk } from './queryKeys';
import type { ToastDetail } from './ToastHost';

// Refetching is not the same as telling someone. Anything that happens in the
// other person's hands and needs to reach this one goes through here, so it
// arrives even when the relevant tab is not the one on screen.
function toast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent('koerbchen:toast', { detail }));
}

// Opens an SSE connection for the active Körbchen and invalidates the
// relevant TanStack Query caches when live events arrive, so every device
// refetches and stays in sync. `currentUserId` keeps your own actions from
// being announced back to you.
export function useLiveEvents(koerbchenId: string | null, currentUserId?: string) {
  const qc = useQueryClient();
  // Stale data that looks live is worse than data that admits it is stale.
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    if (!koerbchenId) return;
    const es = new EventSource(`/api/live/${koerbchenId}`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e: MessageEvent<string>) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(e.data) as LiveEvent;
      } catch {
        return;
      }
      // Keys come from the shared factories so a renamed key can never leave an
      // event silently invalidating nothing.
      const invalidate = (key: readonly unknown[]) => qc.invalidateQueries({ queryKey: key });

      switch (event.type) {
        case 'drink.logged':
        case 'drink.goalReached':
          invalidate(qk.drinkAll(koerbchenId));
          break;
        case 'stars.updated':
          invalidate(qk.starsAll(koerbchenId));
          break;
        case 'diaper.updated':
          invalidate(qk.diaper(koerbchenId));
          break;
        case 'diaper.low': {
          invalidate(qk.diaper(koerbchenId));
          const count = (event.payload as { count?: number } | undefined)?.count;
          toast({
            kind: 'diaper',
            text: typeof count === 'number' ? `Windeln knapp — noch ${count}` : 'Windeln knapp',
          });
          break;
        }
        case 'change.logged':
        case 'change.reminder':
          invalidate(qk.change(koerbchenId));
          break;
        case 'bag.updated':
          invalidate(qk.bags(koerbchenId));
          break;
        case 'plushie.updated':
          invalidate(qk.plushies(koerbchenId));
          break;
        case 'reward.updated':
          invalidate(qk.rewards(koerbchenId));
          break;
        case 'redemption.updated':
          invalidate(qk.redemptions(koerbchenId));
          break;
        case 'quickcall.received': {
          invalidate(qk.quickcalls(koerbchenId));
          // The whole point of a Ruf is to reach the other person. Invalidating
          // a query only reaches them if they happen to be on the Ruf tab.
          const call = event.payload as QuickCallDto | undefined;
          if (call?.text && event.actorUserId !== currentUserId) {
            toast({ kind: 'ruf', text: call.text, emoji: call.emoji, from: call.fromDisplayName });
          }
          break;
        }
        case 'quickcall.acknowledged':
          invalidate(qk.quickcalls(koerbchenId));
          break;
        case 'calendar.updated':
          invalidate(qk.calendarAll(koerbchenId));
          break;
        case 'calendar.reminder': {
          invalidate(qk.calendarAll(koerbchenId));
          const title = (event.payload as { title?: string } | undefined)?.title ?? 'Termin';
          toast({ kind: 'reminder', text: `Erinnerung: ${title}` });
          break;
        }
        case 'koerbchen.updated':
          invalidate(qk.koerbchen(koerbchenId));
          break;
        default:
          break;
      }
    };

    return () => es.close();
  }, [koerbchenId, qc, currentUserId]);

  return { connected };
}
