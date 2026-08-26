import { prisma } from '../lib/prisma';

// Stars awarded for reaching the daily drink goal.
export const DRINK_GOAL_STARS = 1;

// Local midnight — "today" is a calendar day in the server's timezone.
export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getDrinkTotalToday(koerbchenId: string, userId: string): Promise<number> {
  const agg = await prisma.drinkLog.aggregate({
    where: { koerbchenId, userId, createdAt: { gte: startOfToday() } },
    _sum: { amountMl: true },
  });
  return agg._sum.amountMl ?? 0;
}

// Awards stars once per calendar day when the pupp reaches the goal.
// Returns true only on the transition that first crosses the goal.
export async function awardDrinkGoalIfReached(
  koerbchenId: string,
  userId: string,
  goalMl: number,
  totalMl: number,
): Promise<boolean> {
  if (totalMl < goalMl) return false;
  const already = await prisma.starTransaction.findFirst({
    where: { koerbchenId, userId, reason: 'drink_goal', createdAt: { gte: startOfToday() } },
  });
  if (already) return false;
  await prisma.starTransaction.create({
    data: { koerbchenId, userId, delta: DRINK_GOAL_STARS, reason: 'drink_goal' },
  });
  return true;
}

export async function getStarBalance(koerbchenId: string, userId: string): Promise<number> {
  const agg = await prisma.starTransaction.aggregate({
    where: { koerbchenId, userId },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}
