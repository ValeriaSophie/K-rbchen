import { describe, it, expect } from 'vitest';
import { expandOccurrences, MAX_OCCURRENCES, type RecurringEvent } from '../services/recurrence';

const base = (over: Partial<RecurringEvent>): RecurringEvent => ({
  startAt: new Date('2026-03-01T10:00:00.000Z'),
  endAt: null,
  recurrence: 'none',
  recurrenceEnd: null,
  ...over,
});

const D = (s: string) => new Date(s);

describe('expandOccurrences', () => {
  it('returns the single start for a one-off inside the window', () => {
    const occ = expandOccurrences(base({}), D('2026-03-01T00:00:00Z'), D('2026-03-02T00:00:00Z'));
    expect(occ).toHaveLength(1);
    expect(occ[0].start.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('returns nothing for a one-off outside the window', () => {
    const occ = expandOccurrences(base({}), D('2026-04-01T00:00:00Z'), D('2026-04-30T00:00:00Z'));
    expect(occ).toHaveLength(0);
  });

  it('expands a daily series across the window', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'daily' }),
      D('2026-03-01T00:00:00Z'),
      D('2026-03-05T23:59:59Z'),
    );
    expect(occ).toHaveLength(5);
  });

  it('expands a weekly series aligned to the anchor even when it starts before the window', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'weekly' }), // anchor Sun Mar 1
      D('2026-03-10T00:00:00Z'),
      D('2026-03-31T00:00:00Z'),
    );
    // occurrences: Mar 15, 22, 29 (Mar 1 + 8 are before the window)
    expect(occ.map((o) => o.start.toISOString())).toEqual([
      '2026-03-15T10:00:00.000Z',
      '2026-03-22T10:00:00.000Z',
      '2026-03-29T10:00:00.000Z',
    ]);
  });

  it('expands a monthly series', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'monthly' }),
      D('2026-03-01T00:00:00Z'),
      D('2026-06-30T00:00:00Z'),
    );
    expect(occ).toHaveLength(4); // Mar, Apr, May, Jun (15th? no, day 1 10:00)
  });

  it('stops at recurrenceEnd', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'daily', recurrenceEnd: D('2026-03-03T10:00:00Z') }),
      D('2026-03-01T00:00:00Z'),
      D('2026-03-31T00:00:00Z'),
    );
    expect(occ).toHaveLength(3); // Mar 1, 2, 3
  });

  it('preserves the start→end duration on each occurrence', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'daily', endAt: new Date('2026-03-01T11:30:00.000Z') }),
      D('2026-03-01T00:00:00Z'),
      D('2026-03-02T23:59:59Z'),
    );
    expect(occ[1].start.toISOString()).toBe('2026-03-02T10:00:00.000Z');
    expect(occ[1].end?.toISOString()).toBe('2026-03-02T11:30:00.000Z');
  });

  it('never exceeds the occurrence cap', () => {
    const occ = expandOccurrences(
      base({ recurrence: 'daily' }),
      D('2026-03-01T00:00:00Z'),
      D('2030-03-01T00:00:00Z'),
    );
    expect(occ.length).toBeLessThanOrEqual(MAX_OCCURRENCES);
  });

  it('keeps a monthly series on its anchor day instead of drifting past short months', () => {
    // A series anchored on the 31st has to clamp in February and then return to
    // the 31st — stepping month by month would spill into March and leave every
    // later occurrence on the 3rd.
    const occ = expandOccurrences(
      base({ startAt: D('2026-01-31T10:00:00Z'), recurrence: 'monthly' }),
      D('2026-01-01T00:00:00Z'),
      D('2026-05-31T23:59:59Z'),
    );
    expect(occ.map((o) => o.start.toISOString().slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('aligns a long-running series to the window without walking every step', () => {
    // Anchored years before the window: the result must still land on the right
    // weekday, and getting there must not cost thousands of iterations.
    const occ = expandOccurrences(
      base({ startAt: D('2020-03-04T10:00:00Z'), recurrence: 'weekly' }),
      D('2026-03-01T00:00:00Z'),
      D('2026-03-31T23:59:59Z'),
    );
    expect(occ.length).toBeGreaterThan(0);
    for (const o of occ) {
      expect(o.start.getUTCDay()).toBe(D('2020-03-04T10:00:00Z').getUTCDay());
      expect(o.start.getTime()).toBeGreaterThanOrEqual(D('2026-03-01T00:00:00Z').getTime());
    }
  });
});
