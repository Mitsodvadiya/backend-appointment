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

  async createPatient(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { phone, name, age, weight, gender, address, otp } = req.body;

      if (!phone || !otp) {
        return sendError(res, 400, 'Phone number and OTP are required');
      }

      // Filter out explicitly undefined properties just in case
      const patientDataData = { phone, name, age, weight, gender, address };
      const patientData = Object.fromEntries(Object.entries(patientDataData).filter(([_, v]) => v != null)) as any;

      const newPatient = await patientService.createPatient(patientData, otp);

      return sendSuccess(res, 201, 'Patient created successfully', newPatient);
    } catch (error: any) {
      console.error('createPatient error:', error);
      return sendError(res, 400, error.message || 'Failed to create patient', error);
    }
  }

  async sendUpdateOtp(req: AuthRequest, res: Response): Promise<any> {
    try {
      const patientId = req.params.patientId;
      if (!patientId) {
        return sendError(res, 400, 'Patient ID is required');
      }

      const response = await patientService.sendUpdateOtp(patientId as string);

      return sendSuccess(res, 200, 'OTP sent to patient successfully', response);
    } catch (error: any) {
      console.error('sendUpdateOtp error:', error);
      return sendError(res, 400, error.message || 'Failed to send OTP to patient', error);
    }
  }

  async updatePatient(req: AuthRequest, res: Response): Promise<any> {
    try {
      const patientId = req.params.patientId;
      const { otp, name, age, weight, gender, address, phone } = req.body;

      if (!patientId || !otp) {
        return sendError(res, 400, 'Patient ID and OTP are required');
      }

      const patientDataData = { name, age, weight, gender, address, phone };
      const patientData = Object.fromEntries(Object.entries(patientDataData).filter(([_, v]) => v != null));

      const updatedPatient = await patientService.verifyAndUpdatePatient(patientId as string, otp, patientData);

      return sendSuccess(res, 200, 'Patient updated successfully', updatedPatient);
    } catch (error: any) {
      console.error('updatePatient error:', error);
      return sendError(res, 400, error.message || 'Failed to authorize and update patient', error);
    }
  }
}

export const patientController = new PatientController();
