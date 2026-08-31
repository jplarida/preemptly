import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { phone: '+639170000001' },
    update: {},
    create: {
      name: 'Juan Dela Cruz',
      phone: '+639170000001',
      region: 'PH',
    },
  });

  // Create location
  const location = await prisma.location.create({
    data: {
      userId: user.id,
      address: '123 Rizal St, Makati City',
      type: 'HOME',
      timezone: 'Asia/Manila',
    },
  });

  // Create tank with initial estimation
  const tank = await prisma.tank.create({
    data: {
      locationId: location.id,
      capacityKg: 11,
      unit: 'kg',
      model: 'EXCHANGE',
      usageLevel: 'MODERATE',
      lastRefillDate: new Date(),
    },
  });

  // Create initial estimation (time-based, cold start)
  await prisma.estimation.create({
    data: {
      tankId: tank.id,
      timeBasedEstimate: 37, // 11kg / 0.30 kg/day midpoint for HOME/MODERATE
      correctionFactor: 1.0,
      calibratedEstimate: 37,
      confidence: 'LOW',
    },
  });

  // Create test retailer
  const retailer = await prisma.retailer.upsert({
    where: { phone: '+639170000002' },
    update: {},
    create: {
      businessName: 'Gas Express Makati',
      ownerName: 'Maria Santos',
      phone: '+639170000002',
      address: '456 Ayala Ave, Makati City',
      city: 'Makati',
      inviteCode: 'GASEXP01',
      inviteLink: 'app.preemptly.com/join/GASEXP01',
    },
  });

  // Link customer to retailer
  await prisma.customerRetailerLink.create({
    data: {
      customerId: user.id,
      retailerId: retailer.id,
      linkedVia: 'MANUAL_CODE',
      status: 'ACTIVE',
    },
  });

  console.log('Seed data created successfully');
  console.log({ user, location, tank, retailer });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
