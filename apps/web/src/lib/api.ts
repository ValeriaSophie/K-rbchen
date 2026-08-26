import type {
  MeDto,
  KoerbchenDto,
  DrinkTodayDto,
  KoerbchenSettingsInput,
  Role,
  DiaperStatusDto,
  ChangeStatusDto,
  RewardDto,
  RewardInput,
  StarBalanceDto,
  RedemptionDto,
  QuickCallPresetDto,
  QuickCallPresetInput,
  QuickCallDto,
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
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
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

  // Diapers & changes
  diaperStatus: (id: string) => request<DiaperStatusDto>(`/api/koerbchen/${id}/diaper`),
  restockDiaper: (id: string, count: number) =>
    request<DiaperStatusDto>(`/api/koerbchen/${id}/diaper/restock`, {
      method: 'POST',
      body: body({ count }),
    }),
  changeStatus: (id: string) => request<ChangeStatusDto>(`/api/koerbchen/${id}/change`),
  logChange: (id: string, note?: string) =>
    request<{ change: ChangeStatusDto; diaper: DiaperStatusDto }>(`/api/koerbchen/${id}/change`, {
      method: 'POST',
      body: body({ note }),
    }),

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
};
