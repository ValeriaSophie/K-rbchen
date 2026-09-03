import { errorMessage } from './ErrorNote';

// Shared loading and failure states, so no surface in the app answers "I could
// not load this" with silence or with a cheerful empty message that is a lie.

// Panel-shaped placeholder. Same radius and rim as .panel, so a tab that is
// still loading holds the sticker card's footprint instead of collapsing.
export function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    // The shapes are decorative, but the fact that something is loading is not:
    // aria-hidden belongs on the placeholder bars, never on the whole region.
    <section className="panel p-6" role="status">
      <div aria-hidden>
        <div className="h-4 w-24 rounded-full bg-[color:var(--rim-soft)]" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-lg bg-[color:var(--rim-soft)] opacity-50"
              style={{ width: `${100 - i * 12}%` }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Lädt …</span>
    </section>
  );
}

// A whole tab could not load. Names the problem and offers the way out, rather
// than leaving the panel blank under a tab bar that looks fine.
export function PanelError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <section className="panel p-6 text-center" role="alert">
      <p className="tin-label">Das lädt gerade nicht</p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">{errorMessage(error)}</p>
      <button onClick={onRetry} className="btn3d mt-4 px-5 py-2.5 text-sm">
        Nochmal versuchen
      </button>
    </section>
  );
}

// Inline version for a list inside an otherwise working panel: the difference
// between "there is nothing here" and "we could not find out" matters.
export function ListNote({
  isError,
  error,
  onRetry,
  empty,
}: {
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: string;
}) {
  if (!isError) return <p className="text-sm text-[color:var(--muted)]">{empty}</p>;
  return (
    <p className="text-sm text-[color:var(--oxblood-ink)]" role="alert">
      {errorMessage(error) ?? 'Nicht geladen'}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 font-semibold underline underline-offset-2">
          nochmal
        </button>
      )}
    </p>
  );
}
