import { PrismaClient, UserRole, QueueSessionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create a Clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'City Health Clinic',
      address: '123 Health Ave, Medical City',
      phone: '9876543210',
    },
  });
  console.log(`Created Clinic: ${clinic.name} (ID: ${clinic.id})`);

  // Default password for seeded users
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create 2 Doctors
  const doctor1 = await prisma.user.create({
    data: {
      name: 'Dr. Alice Smith',
      email: 'alice@example.com',
      phone: '1111111110',
      password: passwordHash,
      role: UserRole.DOCTOR,
    },
  });
  console.log(`Created Doctor 1: ${doctor1.name} (ID: ${doctor1.id})`);

  const doctor2 = await prisma.user.create({
    data: {
      name: 'Dr. Bob Jones',
      email: 'bob@example.com',
      phone: '2222222220',
      password: passwordHash,
      role: UserRole.DOCTOR,
    },
  });
  console.log(`Created Doctor 2: ${doctor2.name} (ID: ${doctor2.id})`);

  // 3. Link Doctors to the Clinic via ClinicMember
  await prisma.clinicMember.createMany({
    data: [
      { clinicId: clinic.id, userId: doctor1.id, role: UserRole.DOCTOR },
      { clinicId: clinic.id, userId: doctor2.id, role: UserRole.DOCTOR },
    ],
  });
  console.log('Linked both doctors to the Clinic');

  // 4. Create Queue Sessions for each doctor (using today's date)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalized to UTC midnight for consistent @db.Date storing

  const queue1 = await prisma.queueSession.create({
    data: {
      clinicId: clinic.id,
      doctorId: doctor1.id,
      date: today,
      status: QueueSessionStatus.ACTIVE,
      currentToken: 0,
      totalTokens: 0,
    },
  });
  console.log(`Created Queue Session for ${doctor1.name} (ID: ${queue1.id})`);

  const queue2 = await prisma.queueSession.create({
    data: {
      clinicId: clinic.id,
      doctorId: doctor2.id,
      date: today,
      status: QueueSessionStatus.ACTIVE,
      currentToken: 0,
      totalTokens: 0,
    },
  });
  console.log(`Created Queue Session for ${doctor2.name} (ID: ${queue2.id})`);

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
