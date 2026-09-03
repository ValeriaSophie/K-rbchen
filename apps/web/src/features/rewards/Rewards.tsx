import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { KoerbchenDto, RedemptionStatus } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { ErrorNote } from '../../lib/ErrorNote';
import { ListNote } from '../../lib/LoadState';
import { IconStar } from '../../lib/icons';

export function useRewards(id: string) {
  return useQuery({ queryKey: qk.rewards(id), queryFn: () => api.listRewards(id) });
}
export function useStars(id: string, userId: string) {
  return useQuery({ queryKey: qk.stars(id, userId), queryFn: () => api.stars(id, userId) });
}
export function useRedemptions(id: string) {
  return useQuery({ queryKey: qk.redemptions(id), queryFn: () => api.listRedemptions(id) });
}

const STATUS_LABEL: Record<RedemptionStatus, string> = {
  requested: 'angefragt',
  approved: 'genehmigt',
  denied: 'abgelehnt',
};
// Three states, one firing. A decision that has landed is a bone stamp; one
// that was refused is the oxblood plate; one still waiting is the bare rim.
// These used to be mint / gold / red pills, which lit three extra hues on an
// already-open tin.
const STATUS_STYLE: Record<RedemptionStatus, string> = {
  requested: 'badge',
  approved: 'badge badge-done',
  denied: 'badge badge-low',
};

// Earned stars as fired ochre discs seated in the tin, each with its own rim,
// and the empty compartments they will sit in. Level, not tilted — a tin's
// contents are placed, not stuck on.
function StarChart({ count }: { count: number }) {
  const filled = Math.min(count, 12);
  const empty = count === 0 ? 5 : Math.min(4, Math.max(0, 12 - filled));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label={`${count} Sterne gesammelt`}>
      {Array.from({ length: filled }).map((_, i) => (
        <span key={`f${i}`} className="star-sticker" aria-hidden>
          <IconStar filled className="h-3.5 w-3.5" />
        </span>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="star-empty" aria-hidden>
          <IconStar className="h-3.5 w-3.5" />
        </span>
      ))}
      {count > 12 && (
        <span className="pl-1 font-serif text-sm font-bold tracking-wide text-[color:var(--accent-ink)] tabular-nums">
          +{count - 12}
        </span>
      )}
      {count === 0 && <span className="pl-1 text-sm text-[color:var(--muted)]">Noch keine – sammle welche!</span>}
    </div>
  );
}

// Star "currency" marker — a small gold star followed by a count.
function StarCost({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <IconStar filled className="h-3.5 w-3.5 text-[color:var(--star)]" />
      {n}
    </span>
  );
}

// Pupp view: star balance, redeemable rewards, own redemption requests.
export function StarsCard({ koerbchenId, userId }: { koerbchenId: string; userId: string }) {
  const qc = useQueryClient();
  const stars = useStars(koerbchenId, userId);
  const rewards = useRewards(koerbchenId);
  const redemptions = useRedemptions(koerbchenId);
  const balance = stars.data?.balance ?? 0;

  const redeem = useMutation({
    mutationFn: (rewardId: string) => api.redeemReward(koerbchenId, rewardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.redemptions(koerbchenId) }),
  });

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="tin-label">Meine Sterne</h2>
        <span
          className="wordmark text-4xl leading-none tabular-nums"
          style={{ color: 'var(--accent)' }}
        >
          {balance}
        </span>
      </div>
      <StarChart count={balance} />

      <ul className="compartments mt-5 border-t-[1.5px] border-[color:var(--rim-soft)]">
        {(rewards.data ?? [])
          .filter((r) => r.active)
          .map((r) => (
            <li key={r.id} className="compartment flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif font-bold tracking-wide text-[color:var(--ink)]">
                  {r.title}
                </p>
                {r.description && <p className="text-xs text-[color:var(--muted)]">{r.description}</p>}
              </div>
              <button
                onClick={() => redeem.mutate(r.id)}
                disabled={balance < r.costStars || redeem.isPending}
                className="btn3d px-4 py-2 text-sm"
              >
                <StarCost n={r.costStars} />
              </button>
            </li>
          ))}
        {(rewards.data?.length === 0 || rewards.isError) && (
          <li>
            <ListNote
              isError={rewards.isError}
              error={rewards.error}
              onRetry={() => void rewards.refetch()}
              empty="Noch keine Belohnungen."
            />
          </li>
        )}
      </ul>
      <ErrorNote error={redeem.error} />

      {(redemptions.data ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="tin-sublabel">Meine Anfragen</h3>
          <ul className="compartments mt-2.5 border-t-[1.5px] border-[color:var(--rim-soft)]">
            {redemptions.data!.map((r) => (
              <li key={r.id} className="compartment flex items-center justify-between gap-3 text-sm">
                <span className="text-[color:var(--ink)]">
                  {r.rewardTitle} · <StarCost n={r.costStars} />
                </span>
                <span className={STATUS_STYLE[r.status]}>{STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Caregiver view: create rewards, approve/deny requests, grant stars.
export function RewardsAdmin({ koerbchen }: { koerbchen: KoerbchenDto }) {
  const koerbchenId = koerbchen.id;
  const qc = useQueryClient();
  const rewards = useRewards(koerbchenId);
  const redemptions = useRedemptions(koerbchenId);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(3);

  const create = useMutation({
    mutationFn: () => api.createReward(koerbchenId, { title, costStars: cost }),
    onSuccess: () => {
      setTitle('');
      setCost(3);
      qc.invalidateQueries({ queryKey: qk.rewards(koerbchenId) });
    },
  });
  const remove = useMutation({
    mutationFn: (rewardId: string) => api.deleteReward(koerbchenId, rewardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards(koerbchenId) }),
  });
  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      api.decideRedemption(koerbchenId, v.id, v.approve),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.redemptions(koerbchenId) });
      qc.invalidateQueries({ queryKey: qk.starsAll(koerbchenId) });
    },
  });
  const grant = useMutation({
    mutationFn: (v: { userId: string; delta: number }) =>
      api.grantStars(koerbchenId, v.userId, v.delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.starsAll(koerbchenId) }),
  });

  const pupps = koerbchen.members.filter((m) => m.role === 'pupp');
  const pending = (redemptions.data ?? []).filter((r) => r.status === 'requested');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) create.mutate();
  };

  return (
    <section className="panel p-6">
      <h2 className="tin-label">Belohnungen &amp; Sterne</h2>
      <ErrorNote error={decide.error ?? grant.error ?? create.error ?? remove.error} />

      {pending.length > 0 && (
        <div className="mt-5">
          <h3 className="tin-sublabel">Offene Anfragen</h3>
          <ul className="compartments mt-2.5 border-t-[1.5px] border-[color:var(--rim-soft)]">
            {pending.map((r) => (
              <li key={r.id} className="compartment flex items-center justify-between gap-3 text-sm">
                <span className="text-[color:var(--ink)]">
                  {r.rewardTitle} · <StarCost n={r.costStars} />
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decide.mutate({ id: r.id, approve: true })}
                    className="btn3d min-h-9 px-3.5 py-1.5 text-xs"
                  >
                    Genehmigen
                  </button>
                  <button
                    onClick={() => decide.mutate({ id: r.id, approve: false })}
                    className="btn3d-soft min-h-9 px-3.5 py-1.5 text-xs"
                  >
                    Ablehnen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pupps.length > 0 && (
        <div className="mt-6">
          <h3 className="tin-sublabel">Sterne vergeben</h3>
          <ul className="compartments mt-2.5 border-t-[1.5px] border-[color:var(--rim-soft)]">
            {pupps.map((p) => (
              <li key={p.userId} className="compartment flex items-center justify-between gap-3 text-sm">
                <span className="font-serif font-bold tracking-wide text-[color:var(--ink)]">
                  {p.displayName}
                </span>
                <span className="flex shrink-0 gap-2">
                  {[1, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => grant.mutate({ userId: p.userId, delta: n })}
                      className="btn3d-soft min-h-9 px-3.5 py-1.5 text-xs"
                    >
                      +{n}
                      <IconStar filled className="ml-0.5 inline-block h-3 w-3 align-[-1px]" />
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={onCreate} className="mt-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Belohnung"
          className="field flex-1"
        />
        <input
          type="number"
          min={1}
          max={1000}
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="field w-20"
        />
        <button type="submit" disabled={create.isPending} className="btn3d px-5 text-lg">
          +
        </button>
      </form>

      <ul className="compartments mt-4 border-t-[1.5px] border-[color:var(--rim-soft)]">
        {(rewards.data ?? []).map((r) => (
          <li key={r.id} className="compartment flex items-center justify-between gap-3 text-sm">
            <span
              className={r.active ? 'text-[color:var(--ink)]' : 'text-[color:var(--muted)] line-through'}
            >
              {r.title} · <StarCost n={r.costStars} />
            </span>
            {r.active && (
              <button
                onClick={() => remove.mutate(r.id)}
                className="ghost -mr-1.5 shrink-0 hover:text-[color:var(--oxblood-ink)]"
              >
                entfernen
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
