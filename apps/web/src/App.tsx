import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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
import { BagsPanel } from './features/bags/Bags';
import { PlushiesPanel } from './features/plushies/Plushies';
import { StarsCard, RewardsAdmin } from './features/rewards/Rewards';
import { QuickCallPanel, useQuickCalls } from './features/quickcall/QuickCall';
import { CalendarPanel } from './features/calendar/CalendarPanel';
import { ToastHost } from './lib/ToastHost';
import { PanelError, PanelSkeleton } from './lib/LoadState';
import {
  IconDrink,
  IconDiaper,
  IconBag,
  IconTeddy,
  IconStar,
  IconBell,
  IconCalendar,
  IconSliders,
} from './lib/icons';

export function App() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <span className="wordmark text-2xl text-[color:var(--ink)]" aria-label="Lädt">
          Körbchen …
        </span>
      </main>
    );
  }
  if (!me.data) return <AuthPage />;
  if (!me.data.membership) return <CreateOrJoin />;
  return <Dashboard me={me.data} />;
}

export interface TabDef {
  id: string;
  label: string;
  icon: ReactNode;
  render: () => ReactNode;
  // Unread counter. Rides inside the pill rather than pinned to its corner:
  // the strip scrolls horizontally, so a corner bubble would be clipped.
  badge?: number;
}

// One tin per section, each with its own firing. This map is the only place the
// firing is decided: the class goes on the shelf label AND on the panel region,
// so opening a tin floods its body colour into everything below it. Panels used
// to hardcode their own `feat-*`, which drifted — Setup borrowed Ruf's plum for
// its label and then rendered cobalt bodies underneath it.
const TAB_FEAT: Record<string, string> = {
  trinken: 'feat-sky',
  windel: 'feat-mint',
  taschen: 'feat-coral',
  kuscheltiere: 'feat-teal',
  sterne: 'feat-gold',
  ruf: 'feat-bubble',
  kalender: 'feat-grape',
  setup: 'feat-iron',
};

// Pure, presentational tab bar — one pill per section, horizontally scrollable.
// The strip carries more sections than fit a phone, so it owns three jobs the
// markup used to skip: arrow-key navigation, keeping the active pill in view,
// and fading at the edges so the overflow is visible without a scrollbar.
export function TabNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: Array<Pick<TabDef, 'id' | 'label' | 'icon' | 'badge'>>;
  active: string;
  onSelect: (id: string) => void;
}) {
  const pills = useRef<Array<HTMLButtonElement | null>>([]);
  const index = tabs.findIndex((t) => t.id === active);

  useEffect(() => {
    // Optional call: jsdom has no scrollIntoView, and this is a nicety.
    pills.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    pills.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Bereiche"
      onKeyDown={onKeyDown}
      className="tabscroll flex gap-1.5 overflow-x-auto px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t, i) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => {
              pills.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={selected}
            // Roving tabindex: one stop for the whole strip, then arrow keys.
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            className={`tabpill ${TAB_FEAT[t.id] ?? 'feat-iron'} flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm`}
          >
            <span aria-hidden className="flex shrink-0 items-center">
              {t.icon}
            </span>
            {t.label}
            {!!t.badge && (
              <span className="tabbadge" aria-label={`${t.badge} ungelesen`}>
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Dashboard({ me }: { me: MeDto }) {
  const membership = me.membership!;
  const koerbchenId = membership.koerbchenId;
  const role = membership.role;
  const live = useLiveEvents(koerbchenId, me.user.id);
  const koerbchen = useKoerbchen(koerbchenId);
  const quickCalls = useQuickCalls(koerbchenId);

  const k = koerbchen.data;
  // Tabs that need the Koerbchen used to render `null` while it loaded — and
  // for good if the fetch failed, leaving a tab bar above an empty page. One
  // gate now gives all of them a skeleton, and a way back from an error.
  const withK = (render: (k: NonNullable<typeof koerbchen.data>) => ReactNode) => () => {
    if (k) return render(k);
    if (koerbchen.isError)
      return <PanelError error={koerbchen.error} onRetry={() => void koerbchen.refetch()} />;
    return <PanelSkeleton />;
  };
  // A Ruf someone else sent and nobody has acknowledged is the one thing in the
  // app that is waiting on you. It stays countable after its toast expires.
  const unreadRufe = (quickCalls.data ?? []).filter(
    (c) => !c.acknowledgedAt && c.fromUserId !== me.user.id,
  ).length;

  const tabs: TabDef[] =
    role === 'pupp'
      ? [
          { id: 'trinken', label: 'Trinken', icon: <IconDrink className="h-5 w-5" />, render: () => <DrinkCard koerbchenId={koerbchenId} userId={me.user.id} /> },
          { id: 'windel', label: 'Windel', icon: <IconDiaper className="h-5 w-5" />, render: () => <ChangeCard koerbchenId={koerbchenId} /> },
          { id: 'taschen', label: 'Taschen', icon: <IconBag className="h-5 w-5" />, render: () => <BagsPanel koerbchenId={koerbchenId} /> },
          { id: 'kuscheltiere', label: 'Kuscheltiere', icon: <IconTeddy className="h-5 w-5" />, render: () => <PlushiesPanel koerbchenId={koerbchenId} /> },
          { id: 'sterne', label: 'Sterne', icon: <IconStar className="h-5 w-5" />, render: () => <StarsCard koerbchenId={koerbchenId} userId={me.user.id} /> },
          { id: 'ruf', label: 'Ruf', icon: <IconBell className="h-5 w-5" />, badge: unreadRufe, render: () => <QuickCallPanel koerbchenId={koerbchenId} role={role} currentUserId={me.user.id} /> },
          { id: 'kalender', label: 'Kalender', icon: <IconCalendar className="h-5 w-5" />, render: withK((k) => <CalendarPanel koerbchen={k} role={role} currentUserId={me.user.id} />) },
          // A Körbchen created by a pupp has no caregiver yet, and the invite
          // code is the only way to get one in. Without this tab that Körbchen
          // would be a dead end: nobody can be invited and nothing configured.
          { id: 'setup', label: 'Setup', icon: <IconSliders className="h-5 w-5" />, render: withK((k) => <InviteCard code={k.inviteCode} />) },
        ]
      : [
          { id: 'trinken', label: 'Trinken', icon: <IconDrink className="h-5 w-5" />, render: withK((k) => <CaregiverOverview koerbchen={k} />) },
          {
            id: 'windel',
            label: 'Windel',
            icon: <IconDiaper className="h-5 w-5" />,
            render: () => (
              <>
                <DiaperCard koerbchenId={koerbchenId} />
                <ChangeCard koerbchenId={koerbchenId} />
              </>
            ),
          },
          { id: 'taschen', label: 'Taschen', icon: <IconBag className="h-5 w-5" />, render: () => <BagsPanel koerbchenId={koerbchenId} /> },
          { id: 'kuscheltiere', label: 'Kuscheltiere', icon: <IconTeddy className="h-5 w-5" />, render: () => <PlushiesPanel koerbchenId={koerbchenId} /> },
          { id: 'sterne', label: 'Sterne', icon: <IconStar className="h-5 w-5" />, render: withK((k) => <RewardsAdmin koerbchen={k} />) },
          { id: 'ruf', label: 'Ruf', icon: <IconBell className="h-5 w-5" />, badge: unreadRufe, render: () => <QuickCallPanel koerbchenId={koerbchenId} role={role} currentUserId={me.user.id} /> },
          { id: 'kalender', label: 'Kalender', icon: <IconCalendar className="h-5 w-5" />, render: withK((k) => <CalendarPanel koerbchen={k} role={role} currentUserId={me.user.id} />) },
          {
            id: 'setup',
            label: 'Setup',
            icon: <IconSliders className="h-5 w-5" />,
            render: withK((k) => (
              <>
                <InviteCard code={k.inviteCode} />
                <SettingsPage koerbchen={k} />
              </>
            )),
          },
        ];

  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  const feat = TAB_FEAT[current.id] ?? 'feat-iron';

  return (
    <main className="shelf-board min-h-dvh">
      <ToastHost />

      <div className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[color:var(--paper)]/92 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="shelf-col">
          <TopBar
            title={k?.name ?? 'Körbchen'}
            role={role}
            displayName={me.user.displayName}
            connected={live.connected}
          />
          <TabNav tabs={tabs} active={active} onSelect={setActive} />
        </div>
      </div>

      <div
        // The open tin's firing lives here, not in each panel: everything below
        // the lit label is flooded with that one body colour, and nothing else
        // on the shelf is painted.
        // `key` restarts the flood animation on every switch and only then.
        key={current.id}
        id={`panel-${current.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${current.id}`}
        tabIndex={-1}
        // On a phone the tin stands to the fold: a section used to end around
        // 79% of the screen with bare iron below it, which pushed the primary
        // control up out of the thumb arc. Only on a phone — a wide screen has
        // no fold to meet, and stretching there just makes a cavernous tin.
        className={`${feat} tin-open shelf-col flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-md:min-h-[calc(100dvh-8.75rem)] max-md:[&>section:only-child]:flex-1`}
      >
        {current.render()}
      </div>
    </main>
  );
}

function TopBar({
  title,
  role,
  displayName,
  connected,
}: {
  title: string;
  role: string;
  displayName: string;
  connected: boolean;
}) {
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(qk.me, null);
      qc.clear();
    },
  });

  return (
    <header className="flex items-center justify-between px-4 pt-3 pb-2">
      <div className="min-w-0">
        <h1 className="wordmark truncate text-xl text-[color:var(--ink)]">{title}</h1>
        <p className="eyebrow mt-0.5 truncate">
          {displayName} · {role === 'pupp' ? 'Pupp' : 'Caregiver'}
        </p>
        {/* A dropped stream means the other person's Rufe and logs are not
            arriving. That is escalation, so it is oxblood, and it gets its own
            line rather than trailing off the end of a truncating one. */}
        {!connected && (
          <p className="badge badge-low mt-1.5" role="status">
            nicht verbunden
          </p>
        )}
      </div>
      <button onClick={() => logout.mutate()} className="ghost -mr-1.5 shrink-0">
        Abmelden
      </button>
    </header>
  );
}

function InviteCard({ code }: { code: string }) {
  return (
    <section className="panel p-6 text-center">
      <h2 className="tin-sublabel">Einladungs-Code</h2>
      {/* Stencilled, not typewritten. Courier Prime was the last survivor of the
          committed cyberpunk theme; a code stamped on a tin is sprayed through
          the same plate as every other label, with tabular figures so the
          characters keep an even pitch. */}
      <p className="wordmark mt-2.5 text-[2.6rem] leading-none tracking-[0.26em] text-[color:var(--ink)] tabular-nums">
        {code}
      </p>
      <p className="mt-3 text-sm text-[color:var(--muted)]">
        Teile ihn mit deinem Pupp zum Verbinden.
      </p>
    </section>
  );
}
