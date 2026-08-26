import type {
  MeDto,
  KoerbchenDto,
  DrinkTodayDto,
  KoerbchenSettingsInput,
  Role,
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
};
