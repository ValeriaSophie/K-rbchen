import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventDto, KoerbchenDto, Role } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { useCalendar } from './useCalendar';
import { EventForm } from './EventForm';
import {
  IconCalendar,
  IconRepeat,
  IconPencil,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from '../../lib/icons';
import {
  startOfDay,
  addDays,
  isoDay,
  sameDay,
  monthGrid,
  formatDayHeading,
  formatMonthYear,
  formatTime,
  WEEKDAY_LABELS,
} from './dateUtils';

type View = 'agenda' | 'month';

export function CalendarPanel({
  koerbchen,
  role,
  currentUserId,
}: {
  koerbchen: KoerbchenDto;
  role: Role;
  currentUserId: string;
}) {
  const koerbchenId = koerbchen.id;
  const qc = useQueryClient();
  const [view, setView] = useState<View>('agenda');
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventDto | null>(null);
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);

  // Query window depends on the active view.
  const [from, to] = useMemo(() => {
    if (view === 'month') {
      const grid = monthGrid(monthCursor.getFullYear(), monthCursor.getMonth());
      return [grid[0], addDays(grid[41], 1)] as const;
    }
    const f = startOfDay();
    return [f, addDays(f, 42)] as const;
  }, [view, monthCursor]);

  const calendar = useCalendar(koerbchenId, from.toISOString(), to.toISOString());
  const events = calendar.data ?? [];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    for (const e of events) {
      const key = isoDay(new Date(e.occurrenceStart));
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const del = useMutation({
    mutationFn: (eventId: string) => api.deleteEvent(koerbchenId, eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.calendarAll(koerbchenId) }),
  });

  const canEdit = (e: CalendarEventDto) => e.createdBy === currentUserId || role === 'caregiver';

  const openNew = (date?: Date) => {
    setEditing(null);
    setFormDate(date);
    setFormOpen(true);
  };
  const openEdit = (e: CalendarEventDto) => {
    setEditing(e);
    setFormDate(undefined);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <section className="panel p-6">
      <h2 className="tin-label flex items-center gap-2.5">
        <span className="card-ic h-9 w-9 shrink-0">
          <IconCalendar className="h-5 w-5" />
        </span>
        Kalender
      </h2>
      <div className="mt-4 flex items-center gap-2">
        <div className="seg flex flex-1 rounded-full p-0.5 text-xs font-medium">
          {(['agenda', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`min-h-9 flex-1 rounded-full px-3 py-1 ${view === v ? 'seg-on' : 'seg-off'}`}
            >
              {v === 'agenda' ? 'Agenda' : 'Monat'}
            </button>
          ))}
        </div>
        <button
          onClick={() => openNew(selectedDay ?? undefined)}
          className="btn3d min-h-11 shrink-0 px-4 py-2 text-sm whitespace-nowrap"
        >
          + Termin
        </button>
      </div>

      {formOpen && (
        <div className="mt-4">
          <EventForm
            koerbchenId={koerbchenId}
            members={koerbchen.members}
            existing={editing}
            defaultDate={formDate}
            onDone={closeForm}
          />
        </div>
      )}

      {view === 'agenda' ? (
        <AgendaList
          events={events}
          canEdit={canEdit}
          onEdit={openEdit}
          onDelete={(id) => del.mutate(id)}
        />
      ) : (
        <MonthView
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          eventsByDay={eventsByDay}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          canEdit={canEdit}
          onEdit={openEdit}
          onDelete={(id) => del.mutate(id)}
          onAdd={openNew}
        />
      )}
    </section>
  );
}

function TargetBadge({ event }: { event: CalendarEventDto }) {
  const label = event.forEveryone
    ? 'Alle'
    : event.attendees.map((a) => a.displayName).join(', ') || '—';
  return <span className="badge">{label}</span>;
}

function EventRow({
  event,
  canEdit,
  onEdit,
  onDelete,
}: {
  event: CalendarEventDto;
  canEdit: boolean;
  onEdit: (e: CalendarEventDto) => void;
  onDelete: (id: string) => void;
}) {
  const time = event.allDay
    ? 'ganztägig'
    : formatTime(event.occurrenceStart) +
      (event.occurrenceEnd ? `–${formatTime(event.occurrenceEnd)}` : '');
  return (
    <div className="compartment flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-serif font-bold tracking-wide text-[color:var(--ink)]">
          {event.title}
          {event.recurrence !== 'none' && (
            <IconRepeat
              className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted)]"
              aria-label="wiederkehrend"
            />
          )}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--muted)] tabular-nums">
          {time}
          <TargetBadge event={event} />
        </p>
        {event.note && <p className="mt-1 text-xs text-[color:var(--muted)]">{event.note}</p>}
      </div>
      {canEdit && (
        <span className="-my-1 ml-2 flex shrink-0 gap-0.5">
          <button
            onClick={() => onEdit(event)}
            className="rounded-lg p-2 text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
            aria-label="Termin bearbeiten"
          >
            <IconPencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="rounded-lg p-2 text-[color:var(--muted)] transition hover:text-[color:var(--oxblood-ink)]"
            aria-label="Termin löschen"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </span>
      )}
    </div>
  );
}

function AgendaList({
  events,
  canEdit,
  onEdit,
  onDelete,
}: {
  events: CalendarEventDto[];
  canEdit: (e: CalendarEventDto) => boolean;
  onEdit: (e: CalendarEventDto) => void;
  onDelete: (id: string) => void;
}) {
  if (events.length === 0) {
    return <p className="mt-6 text-center text-sm text-[color:var(--muted)]">Keine Termine in den nächsten Wochen.</p>;
  }
  // Group by day, preserving sorted order.
  const groups: Array<{ day: Date; items: CalendarEventDto[] }> = [];
  for (const e of events) {
    const d = new Date(e.occurrenceStart);
    const last = groups[groups.length - 1];
    if (last && sameDay(last.day, d)) last.items.push(e);
    else groups.push({ day: d, items: [e] });
  }
  return (
    <div className="mt-4 space-y-4">
      {groups.map((g) => (
        <div key={isoDay(g.day)}>
          <h3 className="tin-sublabel mb-1">{formatDayHeading(g.day)}</h3>
          <div className="compartments border-t-[1.5px] border-[color:var(--rim-soft)]">
            {g.items.map((e) => (
              <EventRow
                key={`${e.id}-${e.occurrenceStart}`}
                event={e}
                canEdit={canEdit(e)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthView({
  monthCursor,
  setMonthCursor,
  eventsByDay,
  selectedDay,
  setSelectedDay,
  canEdit,
  onEdit,
  onDelete,
  onAdd,
}: {
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  eventsByDay: Map<string, CalendarEventDto[]>;
  selectedDay: Date | null;
  setSelectedDay: (d: Date | null) => void;
  canEdit: (e: CalendarEventDto) => boolean;
  onEdit: (e: CalendarEventDto) => void;
  onDelete: (id: string) => void;
  onAdd: (d: Date) => void;
}) {
  const grid = monthGrid(monthCursor.getFullYear(), monthCursor.getMonth());
  const today = new Date();
  const dayEvents = selectedDay ? (eventsByDay.get(isoDay(selectedDay)) ?? []) : [];

  const shiftMonth = (delta: number) =>
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Vorheriger Monat"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <span className="tin-sublabel">{formatMonthYear(monthCursor)}</span>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Nächster Monat"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-serif text-[0.72rem] font-bold tracking-[0.12em] text-[color:var(--muted)] uppercase">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const inMonth = d.getMonth() === monthCursor.getMonth();
          const dayItems = eventsByDay.get(isoDay(d)) ?? [];
          const isSelected = selectedDay && sameDay(selectedDay, d);
          return (
            <button
              key={isoDay(d)}
              onClick={() => setSelectedDay(d)}
              className={`aspect-square rounded-lg p-1 text-left align-top text-[0.72rem] transition ${
                isSelected ? 'shadow-[0_0_0_1.5px_var(--rim)]' : ''
              } ${
                inMonth
                  ? 'bg-[color:var(--recess-scored)]'
                  : 'bg-transparent text-[color:var(--muted)] opacity-55'
              }`}
            >
              <span
                className={`tabular-nums ${sameDay(d, today) ? 'font-serif font-bold tracking-wide text-[color:var(--accent-ink)]' : ''}`}
              >
                {d.getDate()}
              </span>
              {dayItems.length > 0 && (
                <span className="mt-0.5 flex flex-wrap gap-0.5">
                  {dayItems.slice(0, 3).map((e) => (
                    <span
                      key={`${e.id}-${e.occurrenceStart}`}
                      className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="tin-sublabel">
              {formatDayHeading(selectedDay)}
            </h3>
            <button
              onClick={() => onAdd(selectedDay)}
              className="ghost -mr-1.5"
            >
              + Termin
            </button>
          </div>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Keine Termine an diesem Tag.</p>
          ) : (
            <div className="space-y-1.5">
              {dayEvents.map((e) => (
                <EventRow
                  key={`${e.id}-${e.occurrenceStart}`}
                  event={e}
                  canEdit={canEdit(e)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
