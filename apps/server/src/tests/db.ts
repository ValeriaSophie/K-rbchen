import { prisma } from '../lib/prisma';

// Truncate all tables in FK-safe order (children first). Call in beforeEach.
export async function resetDb() {
  await prisma.calendarAttendee.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.starTransaction.deleteMany();
  await prisma.drinkLog.deleteMany();
  await prisma.changeLog.deleteMany();
  await prisma.diaperType.deleteMany();
  await prisma.bagItem.deleteMany();
  await prisma.bag.deleteMany();
  await prisma.plushie.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.quickCall.deleteMany();
  await prisma.quickCallPreset.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.koerbchen.deleteMany();
  await prisma.user.deleteMany();
}
