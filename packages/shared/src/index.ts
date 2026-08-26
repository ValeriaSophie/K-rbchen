// Shared types & contracts between the Körbchen server and web client.

export type Role = 'caregiver' | 'pupp';

export const ROLES: Role[] = ['caregiver', 'pupp'];

// ---- Auth / identity -------------------------------------------------------

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface MembershipDto {
  role: Role;
  koerbchenId: string;
}

export interface MeDto {
  user: UserDto;
  membership: MembershipDto | null;
}

// ---- Körbchen (shared space) ----------------------------------------------

export interface KoerbchenDto {
  id: string;
  name: string;
  inviteCode: string;
  drinkGoalMl: number;
  changeIntervalMinutes: number;
  diaperCount: number;
  diaperLowThreshold: number;
  lastChangeAt: string | null;
  members: Array<{ userId: string; displayName: string; role: Role }>;
}

export interface KoerbchenSettingsInput {
  name?: string;
  drinkGoalMl?: number;
  changeIntervalMinutes?: number;
  diaperLowThreshold?: number;
}

// ---- Drinking --------------------------------------------------------------

export interface DrinkTodayDto {
  goalMl: number;
  totalMl: number;
  reachedGoal: boolean;
  logs: Array<{ id: string; amountMl: number; createdAt: string; userId: string }>;
}

// ---- Diapers / changes -----------------------------------------------------

export interface DiaperStatusDto {
  count: number;
  lowThreshold: number;
  isLow: boolean;
}

export interface ChangeStatusDto {
  lastChangeAt: string | null;
  intervalMinutes: number;
  dueAt: string | null;
  isDue: boolean;
}

// ---- Rewards / stars -------------------------------------------------------

export type RedemptionStatus = 'requested' | 'approved' | 'denied';

export interface RewardDto {
  id: string;
  title: string;
  description: string | null;
  costStars: number;
  active: boolean;
}

export interface RewardInput {
  title: string;
  description?: string | null;
  costStars: number;
}

export interface StarBalanceDto {
  balance: number;
  transactions: Array<{
    id: string;
    delta: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface RedemptionDto {
  id: string;
  rewardId: string;
  rewardTitle: string;
  costStars: number;
  status: RedemptionStatus;
  createdAt: string;
  decidedAt: string | null;
}

// ---- Quick-call ------------------------------------------------------------

export interface QuickCallPresetDto {
  id: string;
  label: string;
  message: string;
  emoji: string | null;
  sortOrder: number;
}

export interface QuickCallPresetInput {
  label: string;
  message: string;
  emoji?: string | null;
  sortOrder?: number;
}

export interface QuickCallDto {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  text: string;
  emoji: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
}

// ---- Live events (SSE) -----------------------------------------------------

export type LiveEventType =
  | 'drink.logged'
  | 'drink.goalReached'
  | 'diaper.updated'
  | 'diaper.low'
  | 'change.logged'
  | 'change.reminder'
  | 'reward.updated'
  | 'redemption.updated'
  | 'stars.updated'
  | 'quickcall.received'
  | 'quickcall.acknowledged'
  | 'koerbchen.updated';

export interface LiveEvent<T = unknown> {
  type: LiveEventType;
  koerbchenId: string;
  actorUserId?: string;
  payload?: T;
  at: string;
}
