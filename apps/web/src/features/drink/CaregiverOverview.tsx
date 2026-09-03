import type { KoerbchenDto } from '@koerbchen/shared';
import { useDrinkToday } from './useDrinkToday';
import { Jug } from './DrinkCard';
import { IconSparkle } from '../../lib/icons';

// The jug holds a quarter more than the goal — the same vessel on both sides.
const CAPACITY = 1.25;

// Caregiver's read-only view of every pupp's drink progress today.
export function CaregiverOverview({ koerbchen }: { koerbchen: KoerbchenDto }) {
  const pupps = koerbchen.members.filter((m) => m.role === 'pupp');

  return (
    <section className="panel p-6">
      <h2 className="tin-label">Trinken heute</h2>
      {pupps.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--muted)]">Noch kein Pupp im Körbchen.</p>
      ) : (
        <ul className="compartments mt-4 border-t-[1.5px] border-[color:var(--rim-soft)]">
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
  const ratio = goalMl > 0 ? total / goalMl : 0;
  const reached = today.data?.reachedGoal ?? false;

  return (
    <li className="compartment flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-serif font-bold tracking-wide text-[color:var(--ink)]">
          <span className="truncate">{displayName}</span>
          {reached && (
            <IconSparkle
              className="h-4 w-4 shrink-0 text-[color:var(--accent-ink)]"
              aria-label="Ziel erreicht"
            />
          )}
        </p>
        <p className="wordmark mt-1.5 text-2xl leading-none text-[color:var(--ink)] tabular-nums">
          {total}
        </p>
        <p className="tin-sublabel mt-1">von {goalMl} ml</p>
      </div>
      {/* The same graduated jug the Pupp fills, read small. It was a capsule
          progress bar — the chrome FIRST VIEWPORT refuses — and on a wide
          screen it was the whole of this role's first viewport. */}
      <Jug
        pct={Math.min(ratio / CAPACITY, 1)}
        capacity={CAPACITY}
        className="h-28 w-16 shrink-0"
        label={`${displayName}: ${total} von ${goalMl} ml`}
      />
    </li>
  );
}
