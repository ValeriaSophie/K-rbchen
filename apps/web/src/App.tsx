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

export function App() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-rose-50">
        <span className="text-4xl" aria-label="Lädt">
          🧺
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
    <main className="min-h-dvh bg-gradient-to-b from-rose-100 to-amber-50">
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
                className="w-full rounded-full bg-white py-3 font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100 transition hover:bg-rose-50"
              >
                ⚙️ Trinkziel & Einstellungen
              </button>
            )}
          </>
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
    <header className="sticky top-0 z-10 flex items-center justify-between bg-white/70 px-4 py-3 backdrop-blur ring-1 ring-rose-100">
      <div>
        <h1 className="text-lg font-bold text-rose-700">{title}</h1>
        <p className="text-xs text-rose-900/50">
          {displayName} · {role === 'pupp' ? '🐾 Pupp' : '🫶 Caregiver'}
        </p>
      </div>
      <button
        onClick={() => logout.mutate()}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
      >
        Abmelden
      </button>
    </header>
  );
}

function InviteCard({ code }: { code: string }) {
  return (
    <div className="rounded-3xl bg-rose-500 p-5 text-center text-white shadow-sm">
      <p className="text-sm text-white/80">Invite-Code</p>
      <p className="mt-1 text-3xl font-bold tracking-[0.3em]">{code}</p>
      <p className="mt-1 text-xs text-white/70">Teile ihn mit deinem Pupp zum Beitreten.</p>
    </div>
  );
}
