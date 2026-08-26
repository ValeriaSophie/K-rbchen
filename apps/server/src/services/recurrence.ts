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

function addStep(d: Date, kind: Recurrence): Date {
  // Step in UTC so occurrences keep a constant instant-of-day regardless of the
  // server timezone or daylight-saving transitions (deterministic expansion).
  const n = new Date(d);
  if (kind === 'daily') n.setUTCDate(n.getUTCDate() + 1);
  else if (kind === 'weekly') n.setUTCDate(n.getUTCDate() + 7);
  else if (kind === 'monthly') n.setUTCMonth(n.getUTCMonth() + 1);
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

  // Fast-forward from the true anchor so weekly/monthly alignment is preserved.
  let cur = new Date(event.startAt);
  let ff = 0;
  while (cur.getTime() < from.getTime() && cur.getTime() <= seriesEnd.getTime() && ff < 100_000) {
    cur = addStep(cur, kind);
    ff++;
  }

  const result: Occurrence[] = [];
  let guard = 0;
  while (cur.getTime() <= seriesEnd.getTime() && guard < MAX_OCCURRENCES) {
    result.push({ start: new Date(cur), end: makeEnd(cur) });
    cur = addStep(cur, kind);
    guard++;
  }
  return result;
}
