import { EventEmitter } from 'node:events';
import type { LiveEvent } from '@koerbchen/shared';

// In-process live event bus. Events are grouped per Körbchen so an SSE
// connection only receives events for the Körbchen it subscribed to.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type LiveEventListener = (event: LiveEvent) => void;

const channel = (koerbchenId: string) => `k:${koerbchenId}`;

export function subscribe(koerbchenId: string, listener: LiveEventListener): () => void {
  emitter.on(channel(koerbchenId), listener);
  return () => emitter.off(channel(koerbchenId), listener);
}

export function emitLiveEvent(event: LiveEvent): void {
  emitter.emit(channel(event.koerbchenId), event);
}
