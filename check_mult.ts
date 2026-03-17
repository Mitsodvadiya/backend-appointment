import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leaves = await prisma.doctorLeave.findMany();
  console.log("Leaves:");
  leaves.forEach(l => console.log(`${l.id} | ${l.date.toISOString()} | ${l.reason}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
