import { Response } from 'express';
import { patientService } from './patient.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { sendSuccess, sendError } from '../../common/utils/response.util';

export class PatientController {
  async completeProfile(req: AuthRequest, res: Response): Promise<any> {
    try {
      const patientId = req.user?.id;

      if (!patientId) {
        return sendError(res, 401, 'Unauthorized');
      }

      const updatedPatient = await patientService.completeProfile(patientId, req.body);

      return sendSuccess(res, 200, 'Profile completed successfully', updatedPatient);
    } catch (error: any) {
      console.error('completeProfile error:', error);
      return sendError(res, 500, 'Failed to complete profile', error);
    }
  }

  async getPatientByPhone(req: AuthRequest, res: Response): Promise<any> {
    try {
      const phone = req.query.phone as string;

      if (!phone) {
        return sendError(res, 400, 'Phone number is required');
      }

      const patient = await patientService.findByPhone(phone);

      if (!patient) {
        return sendError(res, 404, 'Patient not found');
      }

      return sendSuccess(res, 200, 'Patient retrieved successfully', patient);
    } catch (error: any) {
      console.error('getPatientByPhone error:', error);
      return sendError(res, 500, 'Failed to search for patient', error);
    }
  }
}

export const patientController = new PatientController();
