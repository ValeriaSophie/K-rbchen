import type {
  MeDto,
  KoerbchenDto,
  DrinkTodayDto,
  KoerbchenSettingsInput,
  Role,
  DiaperTypeDto,
  DiaperTypeInput,
  ChangeStatusDto,
  BagDto,
  BagItemDto,
  BagInput,
  BagItemInput,
  PlushieDto,
  PlushieInput,
  RewardDto,
  RewardInput,
  StarBalanceDto,
  RedemptionDto,
  QuickCallPresetDto,
  QuickCallPresetInput,
  QuickCallDto,
  CalendarEventDto,
  CalendarEventInput,
} from '@koerbchen/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Only declare a JSON body when there actually is one. Fastify rejects a
  // request that announces `Content-Type: application/json` and then sends
  // nothing — "Body cannot be empty when content-type is set to
  // 'application/json'" — which is a 400 on every bodiless mutation: logout,
  // acknowledging a Ruf, redeeming a reward, resetting a bag, and every delete.
  const hasBody = options?.body !== undefined && options?.body !== null;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options?.headers ?? {}),
    },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body?.error?.message ?? message;
    } catch {
      // non-JSON error body — keep statusText
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  me: () => request<MeDto>('/api/auth/me'),
  register: (input: { email: string; password: string; displayName: string }) =>
    request<MeDto>('/api/auth/register', { method: 'POST', body: body(input) }),
  login: (input: { email: string; password: string }) =>
    request<MeDto>('/api/auth/login', { method: 'POST', body: body(input) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  createKoerbchen: (input: { name: string; role: Role }) =>
    request<KoerbchenDto>('/api/koerbchen', { method: 'POST', body: body(input) }),
  joinKoerbchen: (input: { inviteCode: string; role: Role }) =>
    request<KoerbchenDto>('/api/koerbchen/join', { method: 'POST', body: body(input) }),
  getKoerbchen: (id: string) => request<KoerbchenDto>(`/api/koerbchen/${id}`),
  updateSettings: (id: string, input: KoerbchenSettingsInput) =>
    request<KoerbchenDto>(`/api/koerbchen/${id}/settings`, { method: 'PATCH', body: body(input) }),

  logDrink: (id: string, amountMl: number) =>
    request<DrinkTodayDto>(`/api/koerbchen/${id}/drink`, {
      method: 'POST',
      body: body({ amountMl }),
    }),
  drinkToday: (id: string, userId?: string) =>
    request<DrinkTodayDto>(
      `/api/koerbchen/${id}/drink/today${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`,
    ),

  // Diapers: configurable types, each with its own stock
  listDiaperTypes: (id: string) => request<DiaperTypeDto[]>(`/api/koerbchen/${id}/diaper`),
  createDiaperType: (id: string, input: DiaperTypeInput) =>
    request<DiaperTypeDto>(`/api/koerbchen/${id}/diaper/types`, {
      method: 'POST',
      body: body(input),
    }),
  updateDiaperType: (
    id: string,
    typeId: string,
    input: Partial<DiaperTypeInput> & { active?: boolean },
  ) =>
    request<DiaperTypeDto>(`/api/koerbchen/${id}/diaper/types/${typeId}`, {
      method: 'PATCH',
      body: body(input),
    }),
  deleteDiaperType: (id: string, typeId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/diaper/types/${typeId}`, { method: 'DELETE' }),
  restockDiaperType: (id: string, typeId: string, count: number) =>
    request<DiaperTypeDto>(`/api/koerbchen/${id}/diaper/types/${typeId}/restock`, {
      method: 'POST',
      body: body({ count }),
    }),

  // Changes
  changeStatus: (id: string) => request<ChangeStatusDto>(`/api/koerbchen/${id}/change`),
  logChange: (id: string, input?: { diaperTypeId?: string; note?: string }) =>
    request<{ change: ChangeStatusDto; diaper: DiaperTypeDto[] }>(`/api/koerbchen/${id}/change`, {
      method: 'POST',
      body: body(input ?? {}),
    }),

  // Bags & packing lists
  listBags: (id: string) => request<BagDto[]>(`/api/koerbchen/${id}/bags`),
  createBag: (id: string, input: BagInput) =>
    request<BagDto>(`/api/koerbchen/${id}/bags`, { method: 'POST', body: body(input) }),
  updateBag: (id: string, bagId: string, input: Partial<BagInput>) =>
    request<BagDto>(`/api/koerbchen/${id}/bags/${bagId}`, { method: 'PATCH', body: body(input) }),
  deleteBag: (id: string, bagId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/bags/${bagId}`, { method: 'DELETE' }),
  addBagItem: (id: string, bagId: string, input: BagItemInput) =>
    request<BagItemDto>(`/api/koerbchen/${id}/bags/${bagId}/items`, {
      method: 'POST',
      body: body(input),
    }),
  updateBagItem: (
    id: string,
    bagId: string,
    itemId: string,
    input: Partial<BagItemInput> & { packed?: boolean },
  ) =>
    request<BagDto>(`/api/koerbchen/${id}/bags/${bagId}/items/${itemId}`, {
      method: 'PATCH',
      body: body(input),
    }),
  deleteBagItem: (id: string, bagId: string, itemId: string) =>
    request<BagDto>(`/api/koerbchen/${id}/bags/${bagId}/items/${itemId}`, { method: 'DELETE' }),
  resetBag: (id: string, bagId: string) =>
    request<BagDto>(`/api/koerbchen/${id}/bags/${bagId}/reset`, { method: 'POST' }),

  // Plushies (Steckbriefe)
  listPlushies: (id: string) => request<PlushieDto[]>(`/api/koerbchen/${id}/plushies`),
  createPlushie: (id: string, input: PlushieInput) =>
    request<PlushieDto>(`/api/koerbchen/${id}/plushies`, { method: 'POST', body: body(input) }),
  updatePlushie: (id: string, plushieId: string, input: Partial<PlushieInput>) =>
    request<PlushieDto>(`/api/koerbchen/${id}/plushies/${plushieId}`, {
      method: 'PATCH',
      body: body(input),
    }),
  deletePlushie: (id: string, plushieId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/plushies/${plushieId}`, { method: 'DELETE' }),

  // Rewards & stars
  listRewards: (id: string) => request<RewardDto[]>(`/api/koerbchen/${id}/rewards`),
  createReward: (id: string, input: RewardInput) =>
    request<RewardDto>(`/api/koerbchen/${id}/rewards`, { method: 'POST', body: body(input) }),
  deleteReward: (id: string, rewardId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/rewards/${rewardId}`, { method: 'DELETE' }),
  stars: (id: string, userId?: string) =>
    request<StarBalanceDto>(
      `/api/koerbchen/${id}/stars${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`,
    ),
  grantStars: (id: string, userId: string, delta: number) =>
    request<{ balance: number }>(`/api/koerbchen/${id}/stars/grant`, {
      method: 'POST',
      body: body({ userId, delta }),
    }),
  redeemReward: (id: string, rewardId: string) =>
    request<RedemptionDto>(`/api/koerbchen/${id}/rewards/${rewardId}/redeem`, { method: 'POST' }),
  listRedemptions: (id: string) => request<RedemptionDto[]>(`/api/koerbchen/${id}/redemptions`),
  decideRedemption: (id: string, redemptionId: string, approve: boolean) =>
    request<RedemptionDto>(`/api/koerbchen/${id}/redemptions/${redemptionId}/decide`, {
      method: 'POST',
      body: body({ approve }),
    }),

  // Quick-call
  listPresets: (id: string) => request<QuickCallPresetDto[]>(`/api/koerbchen/${id}/quickcall/presets`),
  createPreset: (id: string, input: QuickCallPresetInput) =>
    request<QuickCallPresetDto>(`/api/koerbchen/${id}/quickcall/presets`, {
      method: 'POST',
      body: body(input),
    }),
  deletePreset: (id: string, presetId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/quickcall/presets/${presetId}`, {
      method: 'DELETE',
    }),
  sendQuickCall: (id: string, input: { presetId?: string; text?: string; emoji?: string | null }) =>
    request<QuickCallDto>(`/api/koerbchen/${id}/quickcall`, { method: 'POST', body: body(input) }),
  listQuickCalls: (id: string) => request<QuickCallDto[]>(`/api/koerbchen/${id}/quickcall`),
  ackQuickCall: (id: string, callId: string) =>
    request<QuickCallDto>(`/api/koerbchen/${id}/quickcall/${callId}/ack`, { method: 'POST' }),

  // Calendar
  getCalendar: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const q = params.toString();
    return request<CalendarEventDto[]>(`/api/koerbchen/${id}/calendar${q ? `?${q}` : ''}`);
  },
  createEvent: (id: string, input: CalendarEventInput) =>
    request<CalendarEventDto>(`/api/koerbchen/${id}/calendar`, { method: 'POST', body: body(input) }),
  updateEvent: (id: string, eventId: string, input: CalendarEventInput) =>
    request<CalendarEventDto>(`/api/koerbchen/${id}/calendar/${eventId}`, {
      method: 'PATCH',
      body: body(input),
    }),
  deleteEvent: (id: string, eventId: string) =>
    request<{ ok: boolean }>(`/api/koerbchen/${id}/calendar/${eventId}`, { method: 'DELETE' }),
};
