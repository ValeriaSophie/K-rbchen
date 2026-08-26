import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventDto, KoerbchenDto, Role } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { useCalendar } from './useCalendar';
import { EventForm } from './EventForm';
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar', koerbchenId] }),
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
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-800">Kalender 📅</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-rose-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setView('agenda')}
              className={`rounded-full px-3 py-1 ${view === 'agenda' ? 'bg-white text-rose-700 shadow' : 'text-rose-500'}`}
            >
              Agenda
            </button>
            <button
              onClick={() => setView('month')}
              className={`rounded-full px-3 py-1 ${view === 'month' ? 'bg-white text-rose-700 shadow' : 'text-rose-500'}`}
            >
              Monat
            </button>
          </div>
          <button
            onClick={() => openNew(selectedDay ?? undefined)}
            className="rounded-full bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
          >
            + Termin
          </button>
        </div>
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
  return (
    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
      {label}
    </span>
  );
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
    <div className="flex items-start justify-between rounded-2xl bg-rose-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-rose-800">
          {event.title} {event.recurrence !== 'none' && <span title="wiederkehrend">🔁</span>}
        </p>
        <p className="text-xs text-rose-900/50">
          {time} · <TargetBadge event={event} />
        </p>
        {event.note && <p className="mt-0.5 text-xs text-rose-900/60">{event.note}</p>}
      </div>
      {canEdit && (
        <span className="ml-2 flex shrink-0 gap-1">
          <button onClick={() => onEdit(event)} className="text-xs text-rose-400 hover:text-rose-600">
            ✏️
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="text-xs text-rose-400 hover:text-rose-600"
            aria-label="Termin löschen"
          >
            🗑️
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
    return <p className="mt-6 text-center text-sm text-rose-900/40">Keine Termine in den nächsten Wochen.</p>;
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
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-400">
            {formatDayHeading(g.day)}
          </h3>
          <div className="space-y-1.5">
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
        <button onClick={() => shiftMonth(-1)} className="rounded-full px-2 py-1 text-rose-500 hover:bg-rose-50">
          ◀
        </button>
        <span className="text-sm font-semibold text-rose-800">{formatMonthYear(monthCursor)}</span>
        <button onClick={() => shiftMonth(1)} className="rounded-full px-2 py-1 text-rose-500 hover:bg-rose-50">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-rose-400">
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
              className={`aspect-square rounded-xl p-1 text-left align-top text-[11px] transition ${
                isSelected ? 'ring-2 ring-rose-400' : ''
              } ${inMonth ? 'bg-rose-50' : 'bg-transparent text-rose-900/30'}`}
            >
              <span className={sameDay(d, today) ? 'font-bold text-rose-600' : ''}>{d.getDate()}</span>
              {dayItems.length > 0 && (
                <span className="mt-0.5 flex flex-wrap gap-0.5">
                  {dayItems.slice(0, 3).map((e) => (
                    <span key={`${e.id}-${e.occurrenceStart}`} className="h-1.5 w-1.5 rounded-full bg-rose-500" />
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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-400">
              {formatDayHeading(selectedDay)}
            </h3>
            <button
              onClick={() => onAdd(selectedDay)}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700"
            >
              + Termin
            </button>
          </div>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-rose-900/40">Keine Termine an diesem Tag.</p>
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
