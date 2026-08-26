import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DrinkTodayDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { useDrinkToday } from './useDrinkToday';

const QUICK_AMOUNTS = [100, 200, 250, 330];

// The pupp's own drink tracker: progress ring, quick-add buttons, history.
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
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 p-6">
      {data ? (
        <>
          <Ring goalMl={data.goalMl} totalMl={data.totalMl} reached={data.reachedGoal} />

          <div className="mt-6 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => logMutation.mutate(amt)}
                disabled={logMutation.isPending}
                className="rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow transition hover:bg-rose-600 disabled:opacity-60"
              >
                +{amt}
              </button>
            ))}
          </div>

          <CustomAmount onAdd={(ml) => logMutation.mutate(ml)} disabled={logMutation.isPending} />

          <History logs={data.logs} />
        </>
      ) : (
        <p className="text-center text-rose-900/50">Lädt …</p>
      )}
    </section>
  );
}

function Ring({ goalMl, totalMl, reached }: { goalMl: number; totalMl: number; reached: boolean }) {
  const pct = goalMl > 0 ? Math.min(totalMl / goalMl, 1) : 0;
  const size = 200;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffe4e6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={reached ? '#f59e0b' : '#f43f5e'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-rose-700">{totalMl}</span>
        <span className="text-sm text-rose-900/50">von {goalMl} ml</span>
        {reached && <span className="mt-1 text-sm font-medium text-amber-500">Ziel erreicht! 🎉</span>}
      </div>
    </div>
  );
}

function CustomAmount({ onAdd, disabled }: { onAdd: (ml: number) => void; disabled: boolean }) {
  return (
    <form
      className="mt-3 flex gap-2"
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
      <input
        name="ml"
        type="number"
        min={1}
        max={5000}
        placeholder="eigene ml"
        className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-2xl bg-rose-100 px-4 font-semibold text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
      >
        +
      </button>
    </form>
  );
}

function History({ logs }: { logs: DrinkTodayDto['logs'] }) {
  if (logs.length === 0) {
    return <p className="mt-6 text-center text-sm text-rose-900/40">Heute noch nichts getrunken.</p>;
  }
  return (
    <ul className="mt-6 space-y-1">
      {logs.map((l) => (
        <li key={l.id} className="flex justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm">
          <span className="font-medium text-rose-700">{l.amountMl} ml</span>
          <span className="text-rose-900/50">
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
