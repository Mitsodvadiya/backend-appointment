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
}

export const patientController = new PatientController();
