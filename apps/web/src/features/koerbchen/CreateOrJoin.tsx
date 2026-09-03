import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { IconBasket, IconPaw, IconHeart } from '../../lib/icons';

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
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-sm pt-8">
        <h1 className="wordmark flex items-center justify-center gap-2.5 text-3xl text-[color:var(--ink)]">
          <IconBasket className="h-7 w-7 text-[color:var(--accent-ink)]" />
          Willkommen!
        </h1>
        <p className="mt-2 text-center text-sm text-[color:var(--muted)]">
          Erstelle ein Körbchen oder tritt einem bei.
        </p>

        <div className="panel mt-6 p-6">
          <div className="seg grid grid-cols-2 gap-1 rounded-full p-1 mb-5 text-sm font-medium">
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
                <span className="tin-sublabel mb-1.5 block">
                  Name des Körbchens
                </span>
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Unser Nest"
                  required
                />
              </label>
            ) : (
              <label className="block">
                <span className="tin-sublabel mb-1.5 block">Invite-Code</span>
                <input
                  className="field uppercase tracking-widest"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                />
              </label>
            )}

            <fieldset>
              <span className="tin-sublabel mb-2 block">Deine Rolle</span>
              <div className="grid grid-cols-2 gap-2">
                <RolePick
                  active={role === 'pupp'}
                  onClick={() => setRole('pupp')}
                  icon={<IconPaw className="h-7 w-7" />}
                >
                  Pupp
                </RolePick>
                <RolePick
                  active={role === 'caregiver'}
                  onClick={() => setRole('caregiver')}
                  icon={<IconHeart className="h-7 w-7" />}
                >
                  Caregiver
                </RolePick>
              </div>
            </fieldset>

            {error && <p className="text-sm text-[color:var(--oxblood-ink)]">{error}</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn3d w-full rounded-full py-3"
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
        props.active ? 'seg-on' : 'seg-off'
      }`}
    >
      {props.children}
    </button>
  );
}

function RolePick(props: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex flex-col items-center gap-2 rounded-lg py-3.5 transition ${
        props.active
          ? 'bg-[color:var(--enamel)] text-[color:var(--accent-on)] shadow-[0_0_0_1.5px_var(--rim),inset_0_1px_0_rgba(242,236,225,0.2)]'
          : 'bg-transparent text-[color:var(--muted)] shadow-[inset_0_0_0_1.5px_var(--rim-soft)]'
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden>
        {props.icon}
      </span>
      <span className="font-serif text-sm font-semibold tracking-[0.1em] uppercase">
        {props.children}
      </span>
    </button>
  );
}
