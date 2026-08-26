import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

export function useDiaper(id: string) {
  return useQuery({ queryKey: qk.diaper(id), queryFn: () => api.diaperStatus(id) });
}
export function useChange(id: string) {
  return useQuery({ queryKey: qk.change(id), queryFn: () => api.changeStatus(id) });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// Caregiver: diaper stock with restock. Shows a low-stock warning.
export function DiaperCard({ koerbchenId }: { koerbchenId: string }) {
  const qc = useQueryClient();
  const diaper = useDiaper(koerbchenId);
  const restock = useMutation({
    mutationFn: (count: number) => api.restockDiaper(koerbchenId, count),
    onSuccess: (dto) => qc.setQueryData(qk.diaper(koerbchenId), dto),
  });
  const d = diaper.data;

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-800">Windeln 🧷</h2>
        {d && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              d.isLow ? 'bg-red-100 text-red-600' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {d.count} auf Lager
          </span>
        )}
      </div>
      {d?.isLow && (
        <p className="mt-2 text-sm text-red-600">Vorrat niedrig – bitte nachfüllen.</p>
      )}
      <div className="mt-4 flex gap-2">
        {[5, 10, 20].map((n) => (
          <button
            key={n}
            onClick={() => restock.mutate(n)}
            disabled={restock.isPending}
            className="flex-1 rounded-2xl bg-rose-100 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
          >
            +{n}
          </button>
        ))}
      </div>
    </section>
  );
}

// Both roles: change status and a "changed" button.
export function ChangeCard({ koerbchenId }: { koerbchenId: string }) {
  const qc = useQueryClient();
  const change = useChange(koerbchenId);
  const log = useMutation({
    mutationFn: () => api.logChange(koerbchenId),
    onSuccess: (res) => {
      qc.setQueryData(qk.change(koerbchenId), res.change);
      qc.setQueryData(qk.diaper(koerbchenId), res.diaper);
    },
  });
  const c = change.data;

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-800">Wickeln</h2>
        {c?.isDue && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-600">
            fällig
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-rose-900/60">
        Zuletzt gewickelt: <span className="font-medium text-rose-800">{formatTime(c?.lastChangeAt ?? null)}</span>
      </p>
      <button
        onClick={() => log.mutate()}
        disabled={log.isPending}
        className="btn-neon mt-4 w-full rounded-full bg-rose-500 py-3 font-semibold text-[#0a0713] transition hover:bg-rose-600 disabled:opacity-60"
      >
        Frisch gewickelt ✓
      </button>
    </section>
  );
}
