import { prisma } from "../../prisma/client";
import { getStartOfDay } from "../../common/utils/date";

export const getOrCreateQueueSession = async ({
  doctorId,
  clinicId
}: {
  doctorId: string;
  clinicId: string;
}) => {
  const today = getStartOfDay();

  // Validate if Doctor exists
  const doctor = await prisma.user.findFirst({
    where: { 
      id: doctorId,
      role: "DOCTOR",
      isActive: true
    }
  });

  if (!doctor) {
    throw new Error("Doctor is not available or does not exist.");
  }

  // Validate if Clinic exists
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId }
  });

  if (!clinic) {
    throw new Error("Clinic not found.");
  }

  // Optional: Validate if doctor belongs to this clinic
  const clinicMember = await prisma.clinicMember.findUnique({
    where: {
      clinicId_userId: {
        clinicId,
        userId: doctorId
      }
    }
  });

  if (!clinicMember) {
    throw new Error("Doctor is not associated with this clinic.");
  }

  // Validate if Doctor is Scheduled to work today
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const schedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId,
      clinicId,
      dayOfWeek
    }
  });

  if (!schedule) {
    throw new Error("Doctor is not scheduled to work today in this clinic.");
  }

  // Validate if Doctor is on Leave today
  const leave = await prisma.doctorLeave.findUnique({
    where: {
      doctorId_clinicId_date: {
        doctorId,
        clinicId,
        date: today
      }
    }
  });

  if (leave) {
    throw new Error(`Doctor is on leave today. Reason: ${leave.reason || 'None specified'}.`);
  }

  const queue = await prisma.queueSession.upsert({
    where: {
      doctorId_date: {
        doctorId,
        date: today
      }
    },
    update: {},
    create: {
      doctorId,
      clinicId,
      date: today,
      currentToken: 0,
      lastToken: 0,
      totalTokens: 0,
      status: "ACTIVE"
    }
  });

  return queue;
};
