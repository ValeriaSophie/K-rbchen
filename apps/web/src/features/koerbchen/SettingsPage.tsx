import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KoerbchenDto } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

// Caregiver-only settings: rename the Körbchen and set the daily drink goal.
export function SettingsPage({ koerbchen, onDone }: { koerbchen: KoerbchenDto; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(koerbchen.name);
  const [goal, setGoal] = useState(koerbchen.drinkGoalMl);

  useEffect(() => {
    setName(koerbchen.name);
    setGoal(koerbchen.drinkGoalMl);
  }, [koerbchen.name, koerbchen.drinkGoalMl]);

  const mutation = useMutation({
    mutationFn: () => api.updateSettings(koerbchen.id, { name, drinkGoalMl: goal }),
    onSuccess: (k) => {
      qc.setQueryData(qk.koerbchen(k.id), k);
      onDone();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Fehler' : null;

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 p-5">
      <h2 className="text-lg font-semibold text-rose-800">Einstellungen</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-rose-900/80">Name</span>
          <input
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-rose-900/80">
            Trinkziel pro Tag (ml)
          </span>
          <input
            type="number"
            min={100}
            max={10000}
            step={50}
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-full bg-rose-500 py-2.5 font-semibold text-white shadow transition hover:bg-rose-600 disabled:opacity-60"
          >
            {mutation.isPending ? '…' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-full px-4 py-2.5 font-medium text-rose-600 hover:bg-rose-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
