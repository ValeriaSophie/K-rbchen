// Central query-key factories so live-event invalidation and hooks agree.
export const qk = {
  me: ['me'] as const,
  koerbchen: (id: string) => ['koerbchen', id] as const,
  drinkToday: (id: string, userId: string) => ['drink', 'today', id, userId] as const,
  diaper: (id: string) => ['diaper', id] as const,
  change: (id: string) => ['change', id] as const,
  rewards: (id: string) => ['rewards', id] as const,
  stars: (id: string, userId: string) => ['stars', id, userId] as const,
  redemptions: (id: string) => ['redemptions', id] as const,
  presets: (id: string) => ['presets', id] as const,
  quickcalls: (id: string) => ['quickcalls', id] as const,
};
