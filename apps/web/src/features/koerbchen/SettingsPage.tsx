import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KoerbchenDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { ErrorNote } from '../../lib/ErrorNote';
import { IconCheck } from '../../lib/icons';

// Caregiver-only settings: rename the Körbchen and set the daily drink goal.
export function SettingsPage({ koerbchen }: { koerbchen: KoerbchenDto }) {
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
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  // The panel stays open after saving, so without this the save has no visible
  // effect at all. Reset it as soon as the form is edited again.
  const saved = mutation.isSuccess && !mutation.isPending;

  return (
    <section className="panel p-6">
      <h2 className="tin-label">Einstellungen</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="tin-sublabel mb-1.5 block">Name</span>
          <input
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              mutation.reset();
            }}
            required
          />
        </label>

        <label className="block">
          <span className="tin-sublabel mb-1.5 block">Trinkziel pro Tag (ml)</span>
          <input
            type="number"
            min={100}
            max={10000}
            step={50}
            className="field"
            value={goal}
            onChange={(e) => {
              setGoal(Number(e.target.value));
              mutation.reset();
            }}
            required
          />
        </label>

        <ErrorNote error={mutation.error} />

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn3d w-full rounded-full py-2.5"
        >
          {mutation.isPending ? (
            '…'
          ) : saved ? (
            <>
              Gespeichert
              <IconCheck className="ml-2 -mt-0.5 inline-block h-3.5 w-3.5" />
            </>
          ) : (
            'Speichern'
          )}
        </button>
      </form>
    </section>
  );
}
