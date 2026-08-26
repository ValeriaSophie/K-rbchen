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
    mutationFn: async () => {
      if (mode === 'register') {
        return api.register({ email, password, displayName });
      }
      return api.login({ email, password });
    },
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Etwas ist schiefgelaufen'
        : null;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-rose-100 to-amber-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2" aria-hidden>
            🧺
          </div>
          <h1 className="text-3xl font-bold text-rose-700">Körbchen</h1>
          <p className="mt-1 text-sm text-rose-900/60">Fürsorge, gemeinsam getrackt.</p>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-rose-200 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-rose-100 p-1 mb-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-full py-2 transition ${
                mode === 'login' ? 'bg-white text-rose-700 shadow' : 'text-rose-500'
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-full py-2 transition ${
                mode === 'register' ? 'bg-white text-rose-700 shadow' : 'text-rose-500'
              }`}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-full bg-rose-500 py-3 font-semibold text-white shadow-md transition hover:bg-rose-600 disabled:opacity-60"
            >
              {mutation.isPending
                ? '…'
                : mode === 'register'
                  ? 'Konto erstellen'
                  : 'Anmelden'}
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
      <span className="mb-1 block text-sm font-medium text-rose-900/80">{props.label}</span>
      <input
        className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-rose-950 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
      />
    </label>
  );
}
