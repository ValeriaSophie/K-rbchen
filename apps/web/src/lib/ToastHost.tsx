import { useEffect, useState, useCallback } from 'react';
import { IconAlarm, IconBell, IconDiaper, IconX } from './icons';

// Every transient message in the app lands here. The live hook dispatches a
// decoupled `koerbchen:toast` window event; nothing else needs to know a toast
// exists. Kinds are deliberately few — a toast is for something that happened
// somewhere else while you were looking at another tab.
export type ToastKind = 'ruf' | 'reminder' | 'diaper';

export interface ToastDetail {
  kind: ToastKind;
  text: string;
  emoji?: string | null;
  from?: string | null;
}

interface Toast extends ToastDetail {
  id: number;
}

// A Ruf is someone asking for you, so it lingers; the other two are context.
const LIFETIME: Record<ToastKind, number> = {
  ruf: 14000,
  reminder: 8000,
  diaper: 8000,
};

// A toast lands on the iron shelf, beside the open tin rather than inside it,
// so it carries its own firing: each kind wears the enamel of the section it
// came from. Not oxblood, not even for a Ruf — the escalation firing is
// reserved for the marks that escalate, and a body fired in it would make the
// next oxblood plate invisible against its own ground.
const FEAT: Record<ToastKind, string> = {
  ruf: 'feat-bubble',
  reminder: 'feat-gold',
  diaper: 'feat-mint',
};

function KindIcon({ kind }: { kind: ToastKind }) {
  const cls = 'h-4 w-4 shrink-0';
  if (kind === 'ruf') return <IconBell className={cls} />;
  if (kind === 'diaper') return <IconDiaper className={cls} />;
  return <IconAlarm className={cls} />;
}

let nextId = 0;

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastDetail | undefined;
      if (!detail?.text) return;
      const toast: Toast = { ...detail, id: nextId++ };
      // Newest on top, and never more than three on screen — a phone held in
      // one hand has no room for a stack, and the oldest is the least urgent.
      setToasts((list) => [toast, ...list].slice(0, 3));
      setTimeout(() => dismiss(toast.id), LIFETIME[detail.kind] ?? 8000);
    };
    window.addEventListener('koerbchen:toast', handler);
    return () => window.removeEventListener('koerbchen:toast', handler);
  }, [dismiss]);

  return (
    // Polite: these announce things that happened elsewhere, and interrupting
    // someone mid-sentence to say the diaper stock is low would be rude.
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${FEAT[t.kind]} toast-tin pointer-events-auto flex max-w-full items-center gap-2 rounded-full py-2.5 pr-2 pl-4 font-serif text-sm font-bold tracking-wide text-[color:var(--ink)]`}
        >
          <span className="text-[color:var(--accent-ink)]">
            <KindIcon kind={t.kind} />
          </span>
          <span className="min-w-0 truncate">
            {t.emoji ? `${t.emoji} ` : ''}
            {t.text}
            {t.from && (
              <span className="ml-1.5 font-normal text-[color:var(--muted)]">· {t.from}</span>
            )}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Meldung schließen"
            className="ml-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
