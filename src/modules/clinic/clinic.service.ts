import { prisma } from '../../prisma/client';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../../config/env';
import { emailService } from '../../common/utils/email.service';

export class ClinicService {
  async createClinic(
    data: { name: string; address: string; phone?: string },
    ownerId: string,
    ownerRole: string
  ) {
    // Only CLINIC_ADMIN is authorized to create a clinic via this endpoint (enforced by middleware),
    // but you could add extra checks here if needed.
    
    if (data.phone) {
      const existingClinic = await prisma.clinic.findFirst({
        where: { phone: data.phone },
      });
      if (existingClinic) {
        throw new Error('A clinic with this phone number already exists');
      }
    }

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

  async updateClinic(id: string, data: { name?: string; address?: string; phone?: string }) {
    if (data.phone) {
      const existingClinic = await prisma.clinic.findFirst({
        where: { phone: data.phone, NOT: { id } },
      });
      if (existingClinic) {
        throw new Error('A clinic with this phone number already exists');
      }
    }

    const updatedClinic = await prisma.clinic.update({
      where: { id },
      data,
    });

    return updatedClinic;
  }

  async getAllClinics() {
    const clinics = await prisma.clinic.findMany({
      orderBy: { name: 'asc' },
    });
    return clinics;
  }

  async inviteMember(email: string, name: string, role: string, clinicId: string, inviterId: string, phone?: string) {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      throw new Error('Clinic not found');
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      throw new Error('User with this email already exists and is active');
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!user) {
        user = await tx.user.create({
          data: {
            name,
            email,
            phone,
            role: role as UserRole,
            isActive: false, 
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { name, phone, role: role as UserRole }
        });
      }

      const existingMember = await tx.clinicMember.findUnique({
        where: {
          clinicId_userId: {
            clinicId,
            userId: user.id,
          },
        },
      });

      if (!existingMember) {
        await tx.clinicMember.create({
          data: {
            clinicId,
            userId: user.id,
            role: role as UserRole,
          },
        });
      }

      return user;
    });

    const inviteToken = jwt.sign(
      { email, clinicId, purpose: 'clinic_invite' },
      env.jwtSecret,
      { expiresIn: '3d' } // Invite expires in 3 days
    );

    await emailService.sendInviteEmail(email, inviteToken, clinic.name);

    return { message: 'Invitation sent successfully', user: result };
  }

  async activateMember(token: string, newPasswordRaw: string) {
    const decoded: any = jwt.verify(token, env.jwtSecret);
    
    if (decoded.purpose !== 'clinic_invite') {
      throw new Error('Invalid token purpose');
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      include: { clinicMembers: { include: { clinic: true } } }
    });

    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    if (user.isActive) {
      throw new Error('Account is already activated');
    }

    const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
      },
      include: { clinicMembers: { include: { clinic: true } } }
    });

    const jwtToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as any }
    );
    
    const refreshToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role  },
      env.jwtRefreshSecret,
      { expiresIn: env.jwtRefreshExpiresIn as any }
    );

    return {
      message: 'Account activated successfully',
      token: jwtToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      clinic: updatedUser.clinicMembers[0]?.clinic || null
    };
  }

  // =========================
  // CLINIC MEMBERS METHODS
  // =========================

  async getClinicMembers(clinicId: string) {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      throw new Error('Clinic not found');
    }

    const members = await prisma.clinicMember.findMany({
      where: { clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members;
  }

  async getClinicDoctors(clinicId: string) {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      throw new Error('Clinic not found');
    }

    const doctors = await prisma.clinicMember.findMany({
      where: { 
        clinicId,
        role: 'DOCTOR',
        user: {
          isActive: true,
          isAvailable: true,
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return doctors;
  }

  async updateMemberStatus(clinicId: string, memberUserId: string, isActive: boolean) {
    const member = await prisma.clinicMember.findUnique({
      where: {
        clinicId_userId: {
          clinicId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new Error('User is not a member of this clinic');
    }

    const updatedUser = await prisma.user.update({
      where: { id: memberUserId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}

export const clinicService = new ClinicService();
