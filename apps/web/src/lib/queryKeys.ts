// Central query-key factories so live-event invalidation and hooks agree.
//
// Three queries are scoped more narrowly than the live events that affect them:
// drink and stars are per member, the calendar is per date window, while an
// event only says "something changed in this Körbchen". Each of those exposes a
// `*All` prefix covering every variant, which is what the live hook invalidates.
const drinkAll = (id: string) => ['drink', 'today', id] as const;
const starsAll = (id: string) => ['stars', id] as const;
const calendarAll = (id: string) => ['calendar', id] as const;

export const qk = {
  me: ['me'] as const,
  koerbchen: (id: string) => ['koerbchen', id] as const,
  drinkAll,
  drinkToday: (id: string, userId: string) => [...drinkAll(id), userId] as const,
  diaper: (id: string) => ['diaper', id] as const,
  change: (id: string) => ['change', id] as const,
  bags: (id: string) => ['bags', id] as const,
  plushies: (id: string) => ['plushies', id] as const,
  rewards: (id: string) => ['rewards', id] as const,
  starsAll,
  stars: (id: string, userId: string) => [...starsAll(id), userId] as const,
  redemptions: (id: string) => ['redemptions', id] as const,
  presets: (id: string) => ['presets', id] as const,
  quickcalls: (id: string) => ['quickcalls', id] as const,
  calendarAll,
  calendar: (id: string, from: string, to: string) => [...calendarAll(id), from, to] as const,
};
