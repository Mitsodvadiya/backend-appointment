import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leaves = await prisma.doctorLeave.findMany();
  console.log("All Leaves in DB:", leaves);
}
main().catch(console.error).finally(() => prisma.$disconnect());
