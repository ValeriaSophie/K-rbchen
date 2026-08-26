import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { KoerbchenDto, RedemptionStatus } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

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
const STATUS_STYLE: Record<RedemptionStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-600',
};

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
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-800">Meine Sterne</h2>
        <span className="text-2xl font-bold text-amber-500">⭐ {balance}</span>
      </div>

      <ul className="mt-4 space-y-2">
        {(rewards.data ?? [])
          .filter((r) => r.active)
          .map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-rose-800">{r.title}</p>
                {r.description && <p className="text-xs text-rose-900/50">{r.description}</p>}
              </div>
              <button
                onClick={() => redeem.mutate(r.id)}
                disabled={balance < r.costStars || redeem.isPending}
                className="rounded-full bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                ⭐ {r.costStars}
              </button>
            </li>
          ))}
        {rewards.data?.length === 0 && (
          <li className="text-sm text-rose-900/40">Noch keine Belohnungen.</li>
        )}
      </ul>

      {(redemptions.data ?? []).length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-rose-900/70">Meine Anfragen</h3>
          <ul className="mt-2 space-y-1">
            {redemptions.data!.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-rose-800">
                  {r.rewardTitle} · ⭐ {r.costStars}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
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
      qc.invalidateQueries({ queryKey: ['stars', koerbchenId] });
    },
  });
  const grant = useMutation({
    mutationFn: (v: { userId: string; delta: number }) =>
      api.grantStars(koerbchenId, v.userId, v.delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stars', koerbchenId] }),
  });

  const pupps = koerbchen.members.filter((m) => m.role === 'pupp');
  const pending = (redemptions.data ?? []).filter((r) => r.status === 'requested');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) create.mutate();
  };

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 p-6">
      <h2 className="text-lg font-semibold text-rose-800">Belohnungen & Sterne</h2>

      {pending.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-700">Offene Anfragen</h3>
          <ul className="mt-2 space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-rose-800">
                  {r.rewardTitle} · ⭐ {r.costStars}
                </span>
                <span className="flex gap-1">
                  <button
                    onClick={() => decide.mutate({ id: r.id, approve: true })}
                    className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => decide.mutate({ id: r.id, approve: false })}
                    className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-300"
                  >
                    Nein
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pupps.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-rose-900/70">Sterne vergeben</h3>
          <ul className="mt-2 space-y-1">
            {pupps.map((p) => (
              <li key={p.userId} className="flex items-center justify-between text-sm">
                <span className="text-rose-800">{p.displayName}</span>
                <span className="flex gap-1">
                  {[1, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => grant.mutate({ userId: p.userId, delta: n })}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                    >
                      +{n}⭐
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
          className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
        />
        <input
          type="number"
          min={1}
          max={1000}
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-20 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
        >
          +
        </button>
      </form>

      <ul className="mt-3 space-y-1">
        {(rewards.data ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between text-sm">
            <span className={r.active ? 'text-rose-800' : 'text-rose-900/30 line-through'}>
              {r.title} · ⭐ {r.costStars}
            </span>
            {r.active && (
              <button
                onClick={() => remove.mutate(r.id)}
                className="text-xs text-rose-400 hover:text-rose-600"
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
