import type { KoerbchenDto } from '@koerbchen/shared';
import { useDrinkToday } from './useDrinkToday';

// Caregiver's read-only view of every pupp's drink progress today.
export function CaregiverOverview({ koerbchen }: { koerbchen: KoerbchenDto }) {
  const pupps = koerbchen.members.filter((m) => m.role === 'pupp');

  return (
    <section className="panel p-6">
      <p className="eyebrow mb-2">// TRINKEN · ÜBERSICHT</p>
      <h2 className="text-lg font-semibold text-rose-800">Trinken heute</h2>
      {pupps.length === 0 ? (
        <p className="mt-3 text-sm text-rose-900/50">Noch kein Pupp im Körbchen.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pupps.map((p) => (
            <PuppRow
              key={p.userId}
              koerbchenId={koerbchen.id}
              userId={p.userId}
              displayName={p.displayName}
              goalMl={koerbchen.drinkGoalMl}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PuppRow({
  koerbchenId,
  userId,
  displayName,
  goalMl,
}: {
  koerbchenId: string;
  userId: string;
  displayName: string;
  goalMl: number;
}) {
  const today = useDrinkToday(koerbchenId, userId);
  const total = today.data?.totalMl ?? 0;
  const pct = goalMl > 0 ? Math.min(total / goalMl, 1) : 0;
  const reached = today.data?.reachedGoal ?? false;

  return (
    <li>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-rose-800">
          {displayName} {reached && <span title="Ziel erreicht">🎉</span>}
        </span>
        <span className="text-rose-900/60">
          {total} / {goalMl} ml
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-rose-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            reached ? 'bg-amber-400' : 'bg-rose-500'
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </li>
  );
}
