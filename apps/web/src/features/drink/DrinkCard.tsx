import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DrinkTodayDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { useDrinkToday } from './useDrinkToday';
import { IconSparkle } from '../../lib/icons';
import { ErrorNote } from '../../lib/ErrorNote';
import { PanelError, PanelSkeleton } from '../../lib/LoadState';

const QUICK_AMOUNTS = [100, 200, 250, 330];

// The pupp's own drink tracker: the tin fills, quick-add buttons, history.
export function DrinkCard({ koerbchenId, userId }: { koerbchenId: string; userId: string }) {
  const qc = useQueryClient();
  const today = useDrinkToday(koerbchenId, userId);

  const logMutation = useMutation({
    mutationFn: (amountMl: number) => api.logDrink(koerbchenId, amountMl),
    onSuccess: (dto) => {
      qc.setQueryData(qk.drinkToday(koerbchenId, userId), dto);
    },
  });

  const data = today.data;

  return (
    // The reading takes the slack, so the quick-add row settles into the lower
    // third of the screen where a thumb actually reaches it.
    <section className="panel flex flex-col p-6">
      <h2 className="tin-label mb-4">Heute getrunken</h2>
      {data ? (
        <>
          <div className="flex flex-1 items-center">
            <Vessel goalMl={data.goalMl} totalMl={data.totalMl} reached={data.reachedGoal} />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => logMutation.mutate(amt)}
                disabled={logMutation.isPending}
                className="btn3d py-3 text-sm"
              >
                +{amt}
              </button>
            ))}
          </div>

          <CustomAmount onAdd={(ml) => logMutation.mutate(ml)} disabled={logMutation.isPending} />
          <ErrorNote error={logMutation.error} />

          <History logs={data.logs} />
        </>
      ) : today.isError ? (
        <PanelError error={today.error} onRetry={() => void today.refetch()} />
      ) : (
        <PanelSkeleton lines={2} />
      )}
    </section>
  );
}

// A graduated measuring jug, shared by both roles. It is scored all the way up
// in quarters of the goal, so the level can be read against the scale without
// reading a digit — the fill carries the value, which a lone goal line left to
// the numeral. The enamel rises and settles; enamel has no bounce.
export function Jug({
  pct,
  capacity,
  className,
  label,
}: {
  pct: number;
  capacity: number;
  className: string;
  label: string;
}) {
  // Quarter marks of the goal. The goal itself is the scored full-width line;
  // the quarter above it is a tick like the rest, because overfilling is
  // allowed but is not a milestone.
  const ticks = [0.25, 0.5, 0.75].map((q) => q / capacity);
  const goal = 1 / capacity;
  const over = 1.125 / capacity;

  return (
    <div className={`vessel ${className}`} role="img" aria-label={label}>
      <div className="vessel-fill" style={{ ['--level' as string]: pct }} />
      <div className="vessel-scale" aria-hidden>
        {ticks.map((t) => (
          <div
            key={t}
            className={`vessel-tick ${t === 0.5 / capacity ? 'vessel-tick-major' : ''}`}
            style={{ bottom: `${t * 100}%` }}
          />
        ))}
        <div className="vessel-tick" style={{ bottom: `${over * 100}%` }} />
        <div className="vessel-mark" style={{ bottom: `${goal * 100}%` }} />
      </div>
    </div>
  );
}

// The reading IS the fill. A ring drawn around a number is chrome wrapped
// around the value; a vessel that fills is the value, readable from arm's
// length in a dark room without reading the digits at all.
function Vessel({
  goalMl,
  totalMl,
  reached,
}: {
  goalMl: number;
  totalMl: number;
  reached: boolean;
}) {
  // The jug holds a quarter more than the goal, so the goal is a line scored on
  // its wall at 80% rather than the brim — which makes reaching it a visible
  // event and leaves somewhere for an extra glass to go.
  const CAPACITY = 1.25;
  const ratio = goalMl > 0 ? totalMl / goalMl : 0;
  const pct = Math.min(ratio / CAPACITY, 1);

  return (
    // The reading stands beside the jug rather than inside it. Set over the
    // fill, the numerals had to survive both the dark recess above the level
    // and the lit enamel below it, and the label lost at every height a person
    // actually checks. Out here the jug is free to be a pure gauge.
    <div className="flex w-full items-center gap-5">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="wordmark text-6xl leading-none text-[color:var(--ink)] tabular-nums">
          {totalMl}
        </span>
        <span className="tin-sublabel mt-2">von {goalMl} ml</span>
        {reached && (
          <span className="badge badge-done mt-4 self-start">
            <IconSparkle className="mr-1.5 -mt-0.5 inline-block h-3.5 w-3.5" />
            Ziel erreicht
          </span>
        )}
      </div>

      <Jug pct={pct} capacity={CAPACITY} className="h-40 w-20 shrink-0" label={`${totalMl} von ${goalMl} ml getrunken`} />
    </div>
  );
}

function CustomAmount({ onAdd, disabled }: { onAdd: (ml: number) => void; disabled: boolean }) {
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem('ml') as HTMLInputElement;
        const ml = Number(input.value);
        if (ml > 0) {
          onAdd(ml);
          input.value = '';
        }
      }}
    >
      <input name="ml" type="number" min={1} max={5000} placeholder="eigene ml" className="field" />
      <button type="submit" disabled={disabled} className="btn3d px-5 text-lg">
        +
      </button>
    </form>
  );
}

function History({ logs }: { logs: DrinkTodayDto['logs'] }) {
  if (logs.length === 0) {
    return (
      <p className="mt-5 text-center text-sm text-[color:var(--muted)]">
        Heute noch nichts getrunken.
      </p>
    );
  }
  return (
    <ul className="compartments mt-5 border-t-[1.5px] border-[color:var(--rim-soft)]">
      {logs.map((l) => (
        <li key={l.id} className="compartment flex justify-between text-sm">
          <span className="font-serif font-bold tracking-wide text-[color:var(--ink)] tabular-nums">
            {l.amountMl} ml
          </span>
          <span className="text-[color:var(--muted)] tabular-nums">
            {new Date(l.createdAt).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
