import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Dev-Seed: ein Demo-Körbchen mit je einem Caregiver und einem Pupp.
// Idempotent — mehrfaches Ausführen ist unschädlich.
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('passwort123', 10);

  const caregiver = await prisma.user.upsert({
    where: { email: 'caregiver@example.com' },
    update: {},
    create: { email: 'caregiver@example.com', passwordHash, displayName: 'Mama' },
  });
  const pupp = await prisma.user.upsert({
    where: { email: 'pupp@example.com' },
    update: {},
    create: { email: 'pupp@example.com', passwordHash, displayName: 'Pupp' },
  });

  let koerbchen = await prisma.koerbchen.findFirst({ where: { name: 'Demo-Körbchen' } });
  if (!koerbchen) {
    koerbchen = await prisma.koerbchen.create({
      data: { name: 'Demo-Körbchen', inviteCode: 'DEMO01', drinkGoalMl: 1500 },
    });
  }

  await prisma.membership.upsert({
    where: { userId_koerbchenId: { userId: caregiver.id, koerbchenId: koerbchen.id } },
    update: {},
    create: { userId: caregiver.id, koerbchenId: koerbchen.id, role: 'caregiver' },
  });
  await prisma.membership.upsert({
    where: { userId_koerbchenId: { userId: pupp.id, koerbchenId: koerbchen.id } },
    update: {},
    create: { userId: pupp.id, koerbchenId: koerbchen.id, role: 'pupp' },
  });

  console.log(
    'Seed fertig: caregiver@example.com / pupp@example.com (Passwort: passwort123), Invite-Code DEMO01',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
