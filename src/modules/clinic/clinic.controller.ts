import { Request, Response } from 'express';
import { clinicService } from './clinic.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { sendSuccess, sendError } from '../../common/utils/response.util';

export class ClinicController {
  async createClinic(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { name, address, phone } = req.body;
      const ownerId = req.user?.id;
      const ownerRole = req.user?.role;

      if (!name || !address) {
        return sendError(res, 400, 'Name and address are required');
      }

      if (!ownerId || !ownerRole) {
        return sendError(res, 401, 'Unauthorized to create clinic');
      }

      const clinic = await clinicService.createClinic(
        { name, address, phone },
        ownerId,
        ownerRole
      );

      return sendSuccess(res, 201, 'Clinic created successfully', clinic);
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      return sendError(res, 500, 'Failed to create clinic', error);
    }
  }

  async updateClinic(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { name, address, phone } = req.body;

      if (!id) {
        return sendError(res, 400, 'Clinic ID is required');
      }

      const updatedClinic = await clinicService.updateClinic(id, { name, address, phone });

      return sendSuccess(res, 200, 'Clinic updated successfully', updatedClinic);
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      return sendError(res, 400, 'Failed to update clinic', error);
    }
  }

  async getAllClinics(req: Request, res: Response): Promise<any> {
    try {
      const clinics = await clinicService.getAllClinics();
      return sendSuccess(res, 200, 'Clinics retrieved successfully', clinics);
    } catch (error: any) {
      console.error('Error fetching clinics:', error);
      return sendError(res, 500, 'Failed to fetch clinics', error);
    }
  }

  async inviteMember(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.id as string;
      const inviterId = req.user?.id;
      const { email, name, role, phone } = req.body;

      if (!clinicId) {
        return sendError(res, 400, 'Clinic ID is required');
      }

      if (!email || !name || !role) {
        return sendError(res, 400, 'Email, name, and role are required');
      }

      const response = await clinicService.inviteMember(email, name, role, clinicId, inviterId as string, phone);

      return sendSuccess(res, 200, response.message, response);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      return sendError(res, 400, 'Failed to invite member', error);
    }
  }

  async resendInvite(req: Request, res: Response): Promise<any> {
    try {
      const { clinicId } = req.params;
      const { email } = req.body;

      if (!email || !clinicId) {
        return sendError(res, 400, 'Email and Clinic ID are required');
      }

      const response = await clinicService.resendInvite(clinicId as string, email);

      return sendSuccess(res, 200, response.message);
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      return sendError(res, 400, error.message || 'Failed to resend invitation', error);
    }
  }

  async activateMember(req: Request, res: Response): Promise<any> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return sendError(res, 400, 'Token and new password are required');
      }

      if (newPassword.length < 6) {
        return sendError(res, 400, 'Password must be at least 6 characters long');
      }

      const response = await clinicService.activateMember(token, newPassword);

      const { refreshToken, message, ...responseData } = response;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      return sendSuccess(res, 200, message, responseData);
    } catch (error: any) {
      console.error('Error activating member:', error);
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 400, 'Invite link has expired. Please request a new one.');
      }
      return sendError(res, 400, 'Failed to activate account. The link may be invalid.', error);
    }
  }

  // =========================
  // CLINIC MEMBERS METHODS
  // =========================

  async getMembers(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.id as string;

      if (!clinicId) {
        return sendError(res, 400, 'Clinic ID is required');
      }

      const members = await clinicService.getClinicMembers(clinicId);
      return sendSuccess(res, 200, 'Members retrieved successfully', members);
    } catch (error: any) {
      console.error('Error fetching clinic members:', error);
      return sendError(res, 400, 'Failed to fetch clinic members', error);
    }
  }

  async getClinicDoctors(req: Request, res: Response): Promise<any> {
    try {
      const clinicId = req.params.id as string;

      if (!clinicId) {
        return sendError(res, 400, 'Clinic ID is required');
      }

      const doctors = await clinicService.getClinicDoctors(clinicId);
      return sendSuccess(res, 200, 'Doctors retrieved successfully', doctors);
    } catch (error: any) {
      console.error('Error fetching clinic doctors:', error);
      return sendError(res, 400, 'Failed to fetch clinic doctors', error);
    }
  }

  async updateMemberStatus(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.id as string;
      const memberUserId = req.params.userId as string;
      const { isActive } = req.body;

      if (!clinicId || !memberUserId) {
        return sendError(res, 400, 'Clinic ID and User ID are required');
      }

      if (typeof isActive !== 'boolean') {
        return sendError(res, 400, 'isActive boolean flag is required');
      }

      const updatedUser = await clinicService.updateMemberStatus(clinicId, memberUserId, isActive);

      return sendSuccess(res, 200, 'Member status updated successfully', updatedUser);
    } catch (error: any) {
      console.error('Error updating member status:', error);
      return sendError(res, 400, 'Failed to update member status', error);
    }
  }
}

export const clinicController = new ClinicController();
