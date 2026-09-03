import type { Recurrence } from '@koerbchen/shared';

export interface RecurringEvent {
  startAt: Date;
  endAt: Date | null;
  recurrence: string;
  recurrenceEnd: Date | null;
}

export interface Occurrence {
  start: Date;
  end: Date | null;
}

// Cap on how many concrete instances a single series can expand to within one
// query window — guards against runaway loops.
export const MAX_OCCURRENCES = 366;

const STEP_KINDS: Recurrence[] = ['daily', 'weekly', 'monthly'];

// Monthly steps are measured from the series anchor rather than from the
// previous occurrence: stepping a 31st through February would otherwise spill
// into March and every later occurrence would inherit that drift (31.01. →
// 03.03. → 03.04. …). Short months clamp to their last day instead.
function monthlyOccurrence(anchor: Date, monthsAfter: number): Date {
  const target = new Date(anchor);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + monthsAfter);
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return target;
}

// Advances `days` calendar days from `d`. Steps in UTC so occurrences keep a
// constant instant-of-day regardless of the server timezone or daylight-saving
// transitions (deterministic expansion).
function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setUTCDate(n.getUTCDate() + days);
  return n;
}

// Expands a (possibly recurring) event into concrete occurrences whose start
// falls within [from, to]. Occurrences keep the original start→end duration.
export function expandOccurrences(event: RecurringEvent, from: Date, to: Date): Occurrence[] {
  const kind = (STEP_KINDS as string[]).includes(event.recurrence)
    ? (event.recurrence as Recurrence)
    : 'none';
  const durationMs = event.endAt ? event.endAt.getTime() - event.startAt.getTime() : null;
  const makeEnd = (start: Date): Date | null =>
    durationMs != null ? new Date(start.getTime() + durationMs) : null;

  if (kind === 'none') {
    const t = event.startAt.getTime();
    if (t >= from.getTime() && t <= to.getTime()) {
      return [{ start: new Date(event.startAt), end: makeEnd(event.startAt) }];
    }
    return [];
  }

  const seriesEnd =
    event.recurrenceEnd && event.recurrenceEnd.getTime() < to.getTime() ? event.recurrenceEnd : to;

  // The n-th occurrence is always derived from the anchor, never from its
  // predecessor, so no rounding can accumulate across a long series.
  const nth = (i: number): Date =>
    kind === 'monthly'
      ? monthlyOccurrence(event.startAt, i)
      : addDays(event.startAt, i * (kind === 'weekly' ? 7 : 1));

  // Jump straight to the first occurrence at or after `from` instead of
  // stepping there one interval at a time — a series anchored years ago must
  // not cost thousands of iterations per request.
  let index = 0;
  if (event.startAt.getTime() < from.getTime()) {
    const elapsedDays = (from.getTime() - event.startAt.getTime()) / 86_400_000;
    const estimate =
      kind === 'daily'
        ? Math.floor(elapsedDays)
        : kind === 'weekly'
          ? Math.floor(elapsedDays / 7)
          : Math.floor(elapsedDays / 31);
    index = Math.max(0, estimate);
    // The estimate is deliberately low; walk the last few steps exactly.
    while (nth(index).getTime() < from.getTime()) index++;
  }

  const result: Occurrence[] = [];
  while (result.length < MAX_OCCURRENCES) {
    const start = nth(index);
    if (start.getTime() > seriesEnd.getTime()) break;
    result.push({ start, end: makeEnd(start) });
    index++;
  }
  return result;
}
