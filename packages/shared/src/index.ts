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

// A configurable diaper type with its own stock. isLow compares count against
// the Körbchen-wide lowThreshold (echoed here for the client's convenience).
export interface DiaperTypeDto {
  id: string;
  name: string;
  emoji: string | null;
  note: string | null;
  count: number;
  lowThreshold: number;
  isLow: boolean;
  sortOrder: number;
  // false = retired: kept for history and restockable, but no longer offered
  // when logging a change.
  active: boolean;
}

export interface DiaperTypeInput {
  name: string;
  emoji?: string | null;
  note?: string | null;
  sortOrder?: number;
}

export interface ChangeStatusDto {
  lastChangeAt: string | null;
  intervalMinutes: number;
  dueAt: string | null;
  isDue: boolean;
}

// ---- Bags / packing lists --------------------------------------------------

export interface BagItemDto {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  packed: boolean;
  sortOrder: number;
}

export interface BagItemInput {
  name: string;
  quantity?: number;
  note?: string | null;
  sortOrder?: number;
}

export interface BagDto {
  id: string;
  name: string;
  emoji: string | null;
  sortOrder: number;
  items: BagItemDto[];
  packedCount: number;
  totalCount: number;
}

export interface BagInput {
  name: string;
  emoji?: string | null;
  sortOrder?: number;
}

// ---- Plushies / Steckbriefe -------------------------------------------------

export interface PlushieDto {
  id: string;
  name: string;
  emoji: string | null;
  species: string | null;
  character: string | null;
  favorites: string | null;
  bio: string | null;
  photo: string | null; // data: URL of a client-resized thumbnail
  sortOrder: number;
}

export interface PlushieInput {
  name: string;
  emoji?: string | null;
  species?: string | null;
  character?: string | null;
  favorites?: string | null;
  bio?: string | null;
  photo?: string | null;
  sortOrder?: number;
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

// ---- Calendar / appointments ----------------------------------------------

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarAttendeeDto {
  userId: string;
  displayName: string;
}

export interface CalendarEventDto {
  id: string;
  title: string;
  note: string | null;
  startAt: string; // ISO — anchor start of the series
  endAt: string | null;
  allDay: boolean;
  forEveryone: boolean;
  recurrence: Recurrence;
  recurrenceEnd: string | null;
  reminderMinutes: number | null;
  createdBy: string;
  attendees: CalendarAttendeeDto[]; // empty when forEveryone
  occurrenceStart: string; // concrete instance (differs from startAt when recurring)
  occurrenceEnd: string | null;
}

export interface CalendarEventInput {
  title: string;
  note?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  forEveryone?: boolean;
  attendeeUserIds?: string[]; // used when !forEveryone
  recurrence?: Recurrence;
  recurrenceEnd?: string | null;
  reminderMinutes?: number | null;
}

// ---- Live events (SSE) -----------------------------------------------------

export type LiveEventType =
  | 'drink.logged'
  | 'drink.goalReached'
  | 'diaper.updated'
  | 'diaper.low'
  | 'change.logged'
  | 'change.reminder'
  | 'bag.updated'
  | 'plushie.updated'
  | 'reward.updated'
  | 'redemption.updated'
  | 'stars.updated'
  | 'quickcall.received'
  | 'quickcall.acknowledged'
  | 'calendar.updated'
  | 'calendar.reminder'
  | 'koerbchen.updated';

export interface LiveEvent<T = unknown> {
  type: LiveEventType;
  koerbchenId: string;
  actorUserId?: string;
  payload?: T;
  at: string;
}
