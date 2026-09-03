import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KoerbchenDto, CalendarEventDto } from '@koerbchen/shared';
import { CalendarPanel } from './CalendarPanel';

function okJson(body: unknown) {
  return { ok: true, status: 200, statusText: '', json: () => Promise.resolve(body) } as Response;
}

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const koerbchen: KoerbchenDto = {
  id: 'k1',
  name: 'Nest',
  inviteCode: 'ABC123',
  drinkGoalMl: 1500,
  changeIntervalMinutes: 180,
  diaperLowThreshold: 5,
  lastChangeAt: null,
  members: [
    { userId: 'u1', displayName: 'Mama', role: 'caregiver' },
    { userId: 'u2', displayName: 'Pupp', role: 'pupp' },
  ],
};

const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString();
const event: CalendarEventDto = {
  id: 'e1',
  title: 'Abendessen',
  note: null,
  startAt: tomorrowIso,
  endAt: null,
  allDay: false,
  forEveryone: true,
  recurrence: 'none',
  recurrenceEnd: null,
  reminderMinutes: null,
  createdBy: 'u1',
  attendees: [],
  occurrenceStart: tomorrowIso,
  occurrenceEnd: null,
};

describe('CalendarPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the agenda and switches to the month grid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, opts?: RequestInit) =>
        Promise.resolve(okJson((opts?.method ?? 'GET') === 'POST' ? event : [event])),
      ),
    );
    wrap(<CalendarPanel koerbchen={koerbchen} role="caregiver" currentUserId="u1" />);

    expect(await screen.findByText('Abendessen')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Monat' }));
    expect(screen.getByText('Mo')).toBeInTheDocument(); // weekday header of the grid
  });

  it('creates an event through the form', async () => {
    const fetchMock = vi.fn((_url: string, opts?: RequestInit) =>
      Promise.resolve(okJson((opts?.method ?? 'GET') === 'POST' ? event : [])),
    );
    vi.stubGlobal('fetch', fetchMock);
    wrap(<CalendarPanel koerbchen={koerbchen} role="caregiver" currentUserId="u1" />);

    await userEvent.click(screen.getByRole('button', { name: '+ Termin' }));
    expect(await screen.findByText('Neuer Termin')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Titel'), 'Spaziergang');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    const post = fetchMock.mock.calls.find((c) => (c[1]?.method ?? 'GET') === 'POST');
    expect(post?.[0]).toBe('/api/koerbchen/k1/calendar');
    const sent = JSON.parse(String(post?.[1]?.body));
    expect(sent.title).toBe('Spaziergang');
    expect(sent.forEveryone).toBe(true);
  });
});
