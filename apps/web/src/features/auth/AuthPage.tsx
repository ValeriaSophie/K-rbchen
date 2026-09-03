import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ErrorNote } from '../../lib/ErrorNote';
import { qk } from '../../lib/queryKeys';

type Mode = 'login' | 'register';

export function AuthPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      mode === 'register'
        ? api.register({ email, password, displayName })
        : api.login({ email, password }),
    onSuccess: (me) => qc.setQueryData(qk.me, me),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          {/* The wordmark carries its own weight. "CARE JOURNAL" above it was a
              kicker, and an English one in a German-only app. */}
          <h1 className="wordmark text-6xl text-[color:var(--ink)]">KÖRBCHEN</h1>
          <p
            className="mt-3 text-sm tracking-wide text-[color:var(--muted)]"
          >
            fürsorge · geteilt · geborgen
          </p>
        </div>

        <div className="panel p-6">
          <div className="seg mb-5 grid grid-cols-2 gap-1 rounded-full p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-full py-2 transition ${mode === 'login' ? 'seg-on' : 'seg-off'}`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-full py-2 transition ${mode === 'register' ? 'seg-on' : 'seg-off'}`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field
                label="Anzeigename"
                value={displayName}
                onChange={setDisplayName}
                type="text"
                autoComplete="nickname"
                required
              />
            )}
            <Field
              label="E-Mail"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              required
            />
            <Field
              label="Passwort"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />

            <ErrorNote error={mutation.error} className="mt-0" />

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn3d w-full rounded-full py-3 uppercase tracking-wider"
            >
              {mutation.isPending
                ? '···'
                : mode === 'register'
                  ? 'Konto anlegen'
                  : 'Verbinden'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{props.label}</span>
      <input
        className="field"
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
      />
    </label>
  );
}
