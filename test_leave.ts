import { PrismaClient } from '@prisma/client';
import { doctorService } from './src/modules/doctor/doctor.service';

const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.create({
    data: { name: 'Test Clinic X', address: '123 Test St X' },
  });
  const doctor = await prisma.user.create({
    data: { name: 'Test Doc X', email: 'testdoc-x@example.com', role: 'DOCTOR' },
  });
  await prisma.clinicMember.create({
    data: { clinicId: clinic.id, userId: doctor.id, role: 'DOCTOR' },
  });
  const leavesResponse = await doctorService.saveLeaves(clinic.id, doctor.id, [
    { date: '2024-05-10T00:00:00Z', reason: 'Test Leave' },
  ]);
  const leaveId = leavesResponse[0].id;
  console.log('Created Leave:', leaveId);
  const get1 = await doctorService.getLeaves(clinic.id, doctor.id);
  console.log('Leaves after create:', get1.map((l: any) => l.id));
  const delResponse = await doctorService.deleteLeave(clinic.id, leaveId);
  console.log('Delete response:', delResponse);
  const get2 = await doctorService.getLeaves(clinic.id, doctor.id);
  console.log('Leaves after delete:', get2.map((l: any) => l.id));
}
main().catch(console.error).finally(() => prisma.$disconnect());
