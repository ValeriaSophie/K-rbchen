import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
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

  const error =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Verbindung fehlgeschlagen'
        : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <p className="eyebrow mb-3">// CARE&nbsp;TERMINAL — v0.1</p>
          <h1
            className="wordmark text-5xl text-rose-500"
            style={{ animation: 'kb-glitch 7s infinite' }}
          >
            KÖRBCHEN
          </h1>
          <p className="mt-3 font-mono text-xs tracking-widest text-[color:var(--muted)]">
            FÜRSORGE · LIVE-SYNC · GEBORGENHEIT
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

            {error && <p className="font-mono text-sm text-red-600">! {error}</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-neon w-full rounded-full bg-rose-500 py-3 font-semibold uppercase tracking-wider text-[#0a0713] transition hover:bg-rose-600 disabled:opacity-60"
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
