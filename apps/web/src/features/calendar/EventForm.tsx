import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventDto, CalendarEventInput, Recurrence, Role } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
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
      qc.invalidateQueries({ queryKey: ['calendar', koerbchenId] });
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
      <p className="eyebrow">// {existing ? 'TERMIN · EDIT' : 'TERMIN · NEU'}</p>
      <h3 className="font-semibold text-rose-800">{existing ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>

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

      <label className="flex items-center gap-2 text-sm text-rose-900/80">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        Ganztägig
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-rose-900/80">Für wen?</span>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTarget('all')}
            className={`rounded-xl border-2 py-2 text-sm font-medium ${
              target === 'all' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-rose-200 text-rose-500'
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setTarget('select')}
            className={`rounded-xl border-2 py-2 text-sm font-medium ${
              target === 'select' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-rose-200 text-rose-500'
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
                className={`rounded-full px-3 py-1.5 text-sm ${
                  selected.includes(m.userId)
                    ? 'bg-rose-500 text-[#0a0713]'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {m.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <label className="flex-1 text-sm text-rose-900/80">
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
          <label className="flex-1 text-sm text-rose-900/80">
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

      <label className="block text-sm text-rose-900/80">
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-neon flex-1 rounded-full bg-rose-500 py-2.5 font-semibold text-[#0a0713] transition hover:bg-rose-600 disabled:opacity-60"
        >
          {mutation.isPending ? '…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-2.5 font-medium text-rose-600 hover:bg-rose-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
