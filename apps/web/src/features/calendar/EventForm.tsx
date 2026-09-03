import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventDto, CalendarEventInput, Recurrence, Role } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { toDateInput, toTimeInput, combineDateTime } from './dateUtils';

interface Member {
  userId: string;
  displayName: string;
  role: Role;
}

const REMINDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'keine' },
  { value: '0', label: 'zum Zeitpunkt' },
  { value: '10', label: '10 Min vorher' },
  { value: '60', label: '1 Std vorher' },
  { value: '1440', label: '1 Tag vorher' },
];

export function EventForm({
  koerbchenId,
  members,
  existing,
  defaultDate,
  onDone,
}: {
  koerbchenId: string;
  members: Member[];
  existing?: CalendarEventDto | null;
  defaultDate?: Date;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const anchor = existing ? new Date(existing.startAt) : (defaultDate ?? new Date());

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(toDateInput(anchor));
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [startTime, setStartTime] = useState(toTimeInput(anchor));
  const [endTime, setEndTime] = useState(existing?.endAt ? toTimeInput(new Date(existing.endAt)) : '');
  const [target, setTarget] = useState<'all' | 'select'>(
    existing ? (existing.forEveryone ? 'all' : 'select') : 'all',
  );
  const [selected, setSelected] = useState<string[]>(
    existing ? existing.attendees.map((a) => a.userId) : [],
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? 'none');
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    existing?.recurrenceEnd ? toDateInput(new Date(existing.recurrenceEnd)) : '',
  );
  const [reminder, setReminder] = useState(
    existing?.reminderMinutes == null ? 'none' : String(existing.reminderMinutes),
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const mutation = useMutation({
    mutationFn: () => {
      const input: CalendarEventInput = {
        title: title.trim(),
        note: note.trim() || null,
        startAt: combineDateTime(date, allDay ? '00:00' : startTime),
        endAt: !allDay && endTime ? combineDateTime(date, endTime) : null,
        allDay,
        forEveryone: target === 'all',
        attendeeUserIds: target === 'select' ? selected : undefined,
        recurrence,
        recurrenceEnd: recurrence !== 'none' && recurrenceEnd ? combineDateTime(recurrenceEnd, '23:59') : null,
        reminderMinutes: reminder === 'none' ? null : Number(reminder),
      };
      return existing
        ? api.updateEvent(koerbchenId, existing.id, input)
        : api.createEvent(koerbchenId, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.calendarAll(koerbchenId) });
      onDone();
    },
  });

  const toggleMember = (userId: string) =>
    setSelected((s) => (s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId]));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (target === 'select' && selected.length === 0) return;
    mutation.mutate();
  };

  const error =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Fehler' : null;
  const inputCls = 'field';

  return (
    <form onSubmit={onSubmit} className="panel p-5 space-y-3">
      <h3 className="tin-sublabel">{existing ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>

      <input
        className={inputCls}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        required
      />

      <div className="flex gap-2">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        {!allDay && (
          <>
            <input
              type="time"
              className={inputCls}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Startzeit"
            />
            <input
              type="time"
              className={inputCls}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-label="Endzeit"
              placeholder="Ende"
            />
          </>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-2.5 text-sm text-[color:var(--ink)]">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        Ganztägig
      </label>

      <div>
        <span className="tin-sublabel mb-1.5 block">Für wen?</span>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTarget('all')}
            className={`min-h-11 rounded-lg py-2 font-serif text-sm font-semibold tracking-[0.08em] uppercase ${
              target === 'all'
                ? 'bg-[color:var(--enamel)] text-[color:var(--accent-on)] shadow-[0_0_0_1.5px_var(--rim)]'
                : 'text-[color:var(--muted)] shadow-[inset_0_0_0_1.5px_var(--rim-soft)]'
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setTarget('select')}
            className={`min-h-11 rounded-lg py-2 font-serif text-sm font-semibold tracking-[0.08em] uppercase ${
              target === 'select'
                ? 'bg-[color:var(--enamel)] text-[color:var(--accent-on)] shadow-[0_0_0_1.5px_var(--rim)]'
                : 'text-[color:var(--muted)] shadow-[inset_0_0_0_1.5px_var(--rim-soft)]'
            }`}
          >
            Auswählen
          </button>
        </div>
        {target === 'select' && (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggleMember(m.userId)}
                aria-pressed={selected.includes(m.userId)}
                className="chip min-h-11 px-3.5 py-1.5 text-sm"
              >
                {m.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <label className="flex-1 text-sm text-[color:var(--muted)]">
          Wiederholung
          <select
            className={inputCls}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          >
            <option value="none">einmalig</option>
            <option value="daily">täglich</option>
            <option value="weekly">wöchentlich</option>
            <option value="monthly">monatlich</option>
          </select>
        </label>
        {recurrence !== 'none' && (
          <label className="flex-1 text-sm text-[color:var(--muted)]">
            endet am (optional)
            <input
              type="date"
              className={inputCls}
              value={recurrenceEnd}
              onChange={(e) => setRecurrenceEnd(e.target.value)}
            />
          </label>
        )}
      </div>

      <label className="block text-sm text-[color:var(--muted)]">
        Erinnerung
        <select className={inputCls} value={reminder} onChange={(e) => setReminder(e.target.value)}>
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <textarea
        className={inputCls}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional)"
        rows={2}
      />

      {error && <p className="text-sm text-[color:var(--oxblood-ink)]">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={mutation.isPending} className="btn3d flex-1 py-2.5">
          {mutation.isPending ? '…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn3d-soft min-h-11 rounded-full px-4 py-2.5 text-sm uppercase"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
