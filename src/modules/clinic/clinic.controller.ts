import { Request, Response } from 'express';
import { clinicService } from './clinic.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class ClinicController {
  async createClinic(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, address, phone } = req.body;
      const ownerId = req.user?.id;
      const ownerRole = req.user?.role;

      if (!name || !address) {
        res.status(400).json({ error: 'Name and address are required' });
        return;
      }

      if (!ownerId || !ownerRole) {
        res.status(401).json({ error: 'Unauthorized to create clinic' });
        return;
      }

      const clinic = await clinicService.createClinic(
        { name, address, phone },
        ownerId,
        ownerRole
      );

      res.status(201).json({
        message: 'Clinic created successfully',
        clinic,
      });
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      res.status(500).json({ error: error.message || 'Failed to create clinic' });
    }
  }

  async updateClinic(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { name, address, phone } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Clinic ID is required' });
        return;
      }

      const updatedClinic = await clinicService.updateClinic(id, { name, address, phone });

      res.status(200).json({
        message: 'Clinic updated successfully',
        clinic: updatedClinic,
      });
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      res.status(400).json({ error: error.message || 'Failed to update clinic' });
    }
  }

  async inviteMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.id as string;
      const inviterId = req.user?.id;
      const { email, name, role, phone } = req.body;

      if (!clinicId) {
        res.status(400).json({ error: 'Clinic ID is required' });
        return;
      }

      if (!email || !name || !role) {
        res.status(400).json({ error: 'Email, name, and role are required' });
        return;
      }

      const response = await clinicService.inviteMember(email, name, role, clinicId, inviterId as string, phone);

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      res.status(400).json({ error: error.message || 'Failed to invite member' });
    }
  }

  async activateMember(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long' });
        return;
      }

      const response = await clinicService.activateMember(token, newPassword);
      
      const { refreshToken, ...responseData } = response;

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(responseData);
    } catch (error: any) {
      console.error('Error activating member:', error);
      if (error.name === 'TokenExpiredError') {
         res.status(400).json({ error: 'Invite link has expired. Please request a new one.' });
         return;
      }
      res.status(400).json({ error: error.message || 'Failed to activate account. The link may be invalid.' });
    }
  }

  // =========================
  // CLINIC MEMBERS METHODS
  // =========================

  async getMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.id as string;

      if (!clinicId) {
        res.status(400).json({ error: 'Clinic ID is required' });
        return;
      }

      const members = await clinicService.getClinicMembers(clinicId);
      res.status(200).json(members);
    } catch (error: any) {
      console.error('Error fetching clinic members:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch clinic members' });
    }
  }

  async updateMemberStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.id as string;
      const memberUserId = req.params.userId as string;
      const { isActive } = req.body;

      if (!clinicId || !memberUserId) {
        res.status(400).json({ error: 'Clinic ID and User ID are required' });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive boolean flag is required' });
        return;
      }

      const updatedUser = await clinicService.updateMemberStatus(clinicId, memberUserId, isActive);
      
      res.status(200).json({
        message: 'Member status updated successfully',
        user: updatedUser,
      });
    } catch (error: any) {
      console.error('Error updating member status:', error);
      res.status(400).json({ error: error.message || 'Failed to update member status' });
    }
  }
}

export const clinicController = new ClinicController();
