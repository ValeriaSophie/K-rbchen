import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MeDto } from '@koerbchen/shared';
import { api } from './lib/api';
import { qk } from './lib/queryKeys';
import { useLiveEvents } from './lib/live';
import { useMe } from './features/auth/useMe';
import { AuthPage } from './features/auth/AuthPage';
import { CreateOrJoin } from './features/koerbchen/CreateOrJoin';
import { useKoerbchen } from './features/koerbchen/useKoerbchen';
import { SettingsPage } from './features/koerbchen/SettingsPage';
import { DrinkCard } from './features/drink/DrinkCard';
import { CaregiverOverview } from './features/drink/CaregiverOverview';
import { DiaperCard, ChangeCard } from './features/diaper/DiaperChange';
import { StarsCard, RewardsAdmin } from './features/rewards/Rewards';
import { QuickCallPanel } from './features/quickcall/QuickCall';
import { CalendarPanel } from './features/calendar/CalendarPanel';
import { ReminderToast } from './features/calendar/ReminderToast';

export function App() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <span
          className="wordmark text-2xl text-rose-500"
          style={{ animation: 'kb-glitch 2.2s infinite' }}
          aria-label="Lädt"
        >
          KÖRBCHEN
        </span>
      </main>
    );
  }
  if (!me.data) return <AuthPage />;
  if (!me.data.membership) return <CreateOrJoin />;
  return <Dashboard me={me.data} />;
}

function Dashboard({ me }: { me: MeDto }) {
  const membership = me.membership!;
  const koerbchenId = membership.koerbchenId;
  const role = membership.role;
  useLiveEvents(koerbchenId);
  const koerbchen = useKoerbchen(koerbchenId);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <main className="min-h-dvh">
      <ReminderToast />
      <TopBar
        title={koerbchen.data?.name ?? 'Körbchen'}
        role={role}
        displayName={me.user.displayName}
      />

      <div className="mx-auto max-w-md space-y-4 p-4">
        {role === 'pupp' && (
          <>
            <DrinkCard koerbchenId={koerbchenId} userId={me.user.id} />
            <ChangeCard koerbchenId={koerbchenId} />
            <StarsCard koerbchenId={koerbchenId} userId={me.user.id} />
            <QuickCallPanel koerbchenId={koerbchenId} role={role} currentUserId={me.user.id} />
          </>
        )}

        {role === 'caregiver' && koerbchen.data && (
          <>
            <InviteCard code={koerbchen.data.inviteCode} />
            <CaregiverOverview koerbchen={koerbchen.data} />
            <DiaperCard koerbchenId={koerbchenId} />
            <ChangeCard koerbchenId={koerbchenId} />
            <RewardsAdmin koerbchen={koerbchen.data} />
            <QuickCallPanel koerbchenId={koerbchenId} role={role} currentUserId={me.user.id} />
            {showSettings ? (
              <SettingsPage koerbchen={koerbchen.data} onDone={() => setShowSettings(false)} />
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="panel w-full py-3 text-center font-semibold uppercase tracking-wider text-rose-700 transition hover:text-rose-500"
              >
                ⚙ Trinkziel & Einstellungen
              </button>
            )}
          </>
        )}

        {koerbchen.data && (
          <CalendarPanel koerbchen={koerbchen.data} role={role} currentUserId={me.user.id} />
        )}
      </div>
    </main>
  );
}

function TopBar({ title, role, displayName }: { title: string; role: string; displayName: string }) {
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(qk.me, null);
      qc.clear();
    },
  });

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-rose-500/25 bg-[#0b0716]/85 px-4 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="wordmark truncate text-lg text-rose-500">{title}</h1>
        <p className="eyebrow mt-0.5 truncate">
          {displayName} <span className="text-[color:var(--muted)]">·</span>{' '}
          {role === 'pupp' ? 'UNIT // PUPP' : 'OP // CAREGIVER'}
        </p>
      </div>
      <button
        onClick={() => logout.mutate()}
        className="rounded-full border border-rose-500/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-rose-700 transition hover:bg-rose-500/10"
      >
        Trennen
      </button>
    </header>
  );
}

function InviteCard({ code }: { code: string }) {
  return (
    <div className="panel p-5 text-center">
      <p className="eyebrow">// INVITE-CODE</p>
      <p
        className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-[color:var(--cyan)]"
        style={{ textShadow: '0 0 18px rgba(34,232,255,0.55)' }}
      >
        {code}
      </p>
      <p className="mt-2 text-xs text-rose-900/60">Teile ihn mit deinem Pupp zum Koppeln.</p>
    </div>
  );
}
