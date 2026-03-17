import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DoctorService {
  // =========================
  // DOCTOR SCHEDULE
  // =========================

  async getSchedule(clinicId: string, doctorId: string) {
    const schedules = await prisma.doctorSchedule.findMany({
      where: {
        clinicId,
        doctorId,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
    return schedules;
  }

  async saveSchedule(
    clinicId: string,
    doctorId: string,
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration: number;
      maxTokens?: number | null;
    }>
  ) {
    // 1. Verify doctor is actually a part of this clinic as a DOCTOR
    const isMember = await prisma.clinicMember.findUnique({
      where: {
        clinicId_userId: {
          clinicId,
          userId: doctorId,
        },
      },
    });

    if (!isMember || isMember.role !== 'DOCTOR') {
      throw new Error('User is not assigned as a doctor in this clinic');
    }

    // 2. Perform bulk replacement
    const result = await prisma.$transaction(async (tx) => {
      // Delete old schedules
      await tx.doctorSchedule.deleteMany({
        where: {
          clinicId,
          doctorId,
        },
      });

      // Insert new schedules
      if (schedules && schedules.length > 0) {
        const scheduleData = schedules.map((slot) => ({
          clinicId,
          doctorId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotDuration: slot.slotDuration,
          maxTokens: slot.maxTokens || null,
        }));

        await tx.doctorSchedule.createMany({
          data: scheduleData,
        });
      }

      // Return the new schedule
      return await tx.doctorSchedule.findMany({
        where: { clinicId, doctorId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    return result;
  }

  // =========================
  // DOCTOR LEAVES
  // =========================

  async getLeaves(clinicId: string, doctorId: string, startDate?: string, endDate?: string) {
    const whereClause: any = {
      clinicId,
      doctorId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.date = { gte: new Date(startDate) };
    } else if (endDate) {
      whereClause.date = { lte: new Date(endDate) };
    }

    const leaves = await prisma.doctorLeave.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    return leaves;
  }

  async saveLeaves(
    clinicId: string,
    doctorId: string,
    leavesData: Array<{ date: string; reason?: string }>
  ) {
    // 1. Verify doctor membership
    const isMember = await prisma.clinicMember.findUnique({
      where: {
        clinicId_userId: {
          clinicId,
          userId: doctorId,
        },
      },
    });

    if (!isMember || isMember.role !== 'DOCTOR') {
      throw new Error('User is not assigned as a doctor in this clinic');
    }

    // 2. Bulk upsert/insert the leave dates (ignoring duplicates via unique constraint catch or filtering)
    const result = await prisma.$transaction(async (tx) => {
      const createdLeaves = [];

      for (const leave of leavesData) {
        const parsedDate = new Date(leave.date);
        
        // Use upsert to avoid duplicate date errors on the same clinic/doctor
        const created = await tx.doctorLeave.upsert({
          where: {
            doctorId_clinicId_date: {
              doctorId,
              clinicId,
              date: parsedDate,
            },
          },
          update: {
            reason: leave.reason,
          },
          create: {
            doctorId,
            clinicId,
            date: parsedDate,
            reason: leave.reason,
          },
        });
        
        createdLeaves.push(created);
      }

      return createdLeaves;
    });

    return result;
  }

  async deleteLeave(clinicId: string, leaveId: string) {
    // Verify the leave exists and belongs to the clinic before deleting
    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave || leave.clinicId !== clinicId) {
      throw new Error('Leave not found or does not belong to this clinic');
    }

    await prisma.doctorLeave.delete({
      where: { id: leaveId },
    });

    return { message: 'Leave removed successfully' };
  }
}

export const doctorService = new DoctorService();
