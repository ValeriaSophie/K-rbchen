import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

type Tab = 'create' | 'join';

export function CreateOrJoin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<Role>('pupp');

  const mutation = useMutation({
    mutationFn: async () =>
      tab === 'create'
        ? api.createKoerbchen({ name, role })
        : api.joinKoerbchen({ inviteCode, role }),
    onSuccess: (k) => {
      qc.setQueryData(qk.koerbchen(k.id), k);
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Fehler' : null;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-rose-100 to-amber-50 p-6">
      <div className="mx-auto max-w-sm pt-8">
        <h1 className="text-center text-2xl font-bold text-rose-700">Willkommen! 🧺</h1>
        <p className="mt-1 text-center text-sm text-rose-900/60">
          Erstelle ein Körbchen oder tritt einem bei.
        </p>

        <div className="mt-6 rounded-3xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-rose-200 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-rose-100 p-1 mb-5 text-sm font-medium">
            <TabButton active={tab === 'create'} onClick={() => setTab('create')}>
              Erstellen
            </TabButton>
            <TabButton active={tab === 'join'} onClick={() => setTab('join')}>
              Beitreten
            </TabButton>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {tab === 'create' ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-rose-900/80">
                  Name des Körbchens
                </span>
                <input
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Unser Nest"
                  required
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-rose-900/80">Invite-Code</span>
                <input
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 uppercase tracking-widest outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                />
              </label>
            )}

            <fieldset>
              <span className="mb-2 block text-sm font-medium text-rose-900/80">Deine Rolle</span>
              <div className="grid grid-cols-2 gap-2">
                <RolePick active={role === 'pupp'} onClick={() => setRole('pupp')} emoji="🐾">
                  Pupp
                </RolePick>
                <RolePick
                  active={role === 'caregiver'}
                  onClick={() => setRole('caregiver')}
                  emoji="🫶"
                >
                  Caregiver
                </RolePick>
              </div>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-full bg-rose-500 py-3 font-semibold text-white shadow-md transition hover:bg-rose-600 disabled:opacity-60"
            >
              {mutation.isPending ? '…' : tab === 'create' ? 'Körbchen erstellen' : 'Beitreten'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-full py-2 transition ${
        props.active ? 'bg-white text-rose-700 shadow' : 'text-rose-500'
      }`}
    >
      {props.children}
    </button>
  );
}

function RolePick(props: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 transition ${
        props.active
          ? 'border-rose-400 bg-rose-50 text-rose-700'
          : 'border-rose-200 bg-white text-rose-500'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {props.emoji}
      </span>
      <span className="text-sm font-medium">{props.children}</span>
    </button>
  );
}
