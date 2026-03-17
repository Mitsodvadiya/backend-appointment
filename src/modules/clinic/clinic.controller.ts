import { Response } from 'express';
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
}

export const clinicController = new ClinicController();
