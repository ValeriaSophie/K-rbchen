// Small date helpers for the calendar — no external date library.

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Local YYYY-MM-DD key for grouping.
export function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 6-week (42 cell) grid starting on the Monday on/before the 1st of the month.
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const weekday = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const gridStart = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function formatDayHeading(d: Date): string {
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// For <input type="date"> / <input type="time"> prefilling.
export function toDateInput(d: Date): string {
  return isoDay(d);
}
export function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Combine a date input (YYYY-MM-DD) and time input (HH:mm) into an ISO string.
export function combineDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr ? timeStr.split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
