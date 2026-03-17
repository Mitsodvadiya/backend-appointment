import { Response } from 'express';
import { patientService } from './patient.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class PatientController {
  async completeProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user?.id;

      if (!patientId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updatedPatient = await patientService.completeProfile(patientId, req.body);

      res.status(200).json({
        message: 'Profile completed successfully',
        patient: updatedPatient,
      });
    } catch (error) {
      console.error('completeProfile error:', error);
      res.status(500).json({ error: 'Failed to complete profile' });
    }
  }

  async getPatientByPhone(req: AuthRequest, res: Response): Promise<void> {
    try {
      const phone = req.query.phone as string;

      if (!phone) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }

      const patient = await patientService.findByPhone(phone);

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.status(200).json(patient);
    } catch (error) {
      console.error('getPatientByPhone error:', error);
      res.status(500).json({ error: 'Failed to search for patient' });
    }
  }
}

export const patientController = new PatientController();
