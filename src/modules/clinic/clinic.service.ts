import { prisma } from '../../prisma/client';
import { UserRole } from '@prisma/client';

export class ClinicService {
  async createClinic(
    data: { name: string; address: string; phone?: string },
    ownerId: string,
    ownerRole: string
  ) {
    // Only CLINIC_ADMIN is authorized to create a clinic via this endpoint (enforced by middleware),
    // but you could add extra checks here if needed.
    
    // Create clinic and the first member in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
        },
      });

      await tx.clinicMember.create({
        data: {
          clinicId: clinic.id,
          userId: ownerId,
          role: ownerRole as UserRole, // Should be CLINIC_ADMIN based on the user's role
        },
      });

      return clinic;
    });

    return result;
  }

  async updateClinic(
    clinicId: string,
    data: { name?: string; address?: string; phone?: string }
  ) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic || clinic.deletedAt) {
      throw new Error('Clinic not found');
    }

    const updatedClinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...data,
      },
    });

    return updatedClinic;
  }
}

export const clinicService = new ClinicService();
