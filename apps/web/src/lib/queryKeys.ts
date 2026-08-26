// Central query-key factories so live-event invalidation and hooks agree.
export const qk = {
  me: ['me'] as const,
  koerbchen: (id: string) => ['koerbchen', id] as const,
  drinkToday: (id: string, userId: string) => ['drink', 'today', id, userId] as const,
};
