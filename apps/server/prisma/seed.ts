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

  // Example diaper types, only if this Körbchen has none yet (idempotent).
  const existingTypes = await prisma.diaperType.count({ where: { koerbchenId: koerbchen.id } });
  if (existingTypes === 0) {
    await prisma.diaperType.createMany({
      data: [
        { koerbchenId: koerbchen.id, name: 'Tag', emoji: '☀️', count: 12, sortOrder: 0 },
        { koerbchenId: koerbchen.id, name: 'Nacht', emoji: '🌙', note: 'saugstärker', count: 8, sortOrder: 1 },
      ],
    });
  }

  // Example bags with a planned packing list, only if none exist yet.
  const existingBags = await prisma.bag.count({ where: { koerbchenId: koerbchen.id } });
  if (existingBags === 0) {
    const swim = await prisma.bag.create({
      data: { koerbchenId: koerbchen.id, name: 'Schwimmtasche', emoji: '🏊', sortOrder: 0 },
    });
    await prisma.bagItem.createMany({
      data: [
        { bagId: swim.id, name: 'Badehose', quantity: 1, sortOrder: 0 },
        { bagId: swim.id, name: 'Handtuch', quantity: 2, sortOrder: 1 },
        { bagId: swim.id, name: 'Schwimmwindeln', quantity: 3, note: 'im Seitenfach', sortOrder: 2 },
      ],
    });
    const wickel = await prisma.bag.create({
      data: { koerbchenId: koerbchen.id, name: 'Wickeltasche', emoji: '🧷', sortOrder: 1 },
    });
    await prisma.bagItem.createMany({
      data: [
        { bagId: wickel.id, name: 'Windeln', quantity: 5, sortOrder: 0 },
        { bagId: wickel.id, name: 'Feuchttücher', quantity: 1, sortOrder: 1 },
        { bagId: wickel.id, name: 'Wechselkleidung', quantity: 1, sortOrder: 2 },
      ],
    });
  }

  // Example plushie Steckbrief, only if none exist yet.
  const existingPlushies = await prisma.plushie.count({ where: { koerbchenId: koerbchen.id } });
  if (existingPlushies === 0) {
    await prisma.plushie.create({
      data: {
        koerbchenId: koerbchen.id,
        name: 'Bruno',
        emoji: '🐻',
        species: 'Bär',
        character: 'schmusig, etwas frech',
        favorites: 'Honigbrote & Verstecken',
        bio: 'Brunos liebster Platz ist unterm Arm beim Einschlafen.',
        sortOrder: 0,
      },
    });
  }

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
