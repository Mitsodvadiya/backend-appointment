import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('Cleaning database...');
  
  // Truncate all tables. CASCADE ensures that dependent rows in child tables are also deleted.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "User", 
      "Clinic", 
      "ClinicMember", 
      "Patient", 
      "DoctorSchedule", 
      "DoctorLeave", 
      "QueueSession", 
      "Visit", 
      "Token", 
      "TokenAction" 
    CASCADE;
  `);

  console.log('Database cleaned successfully.');
}

clean()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
