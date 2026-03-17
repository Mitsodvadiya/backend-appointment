import { Request, Response } from 'express';
import { doctorService } from './doctor.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { sendSuccess, sendError } from '../../common/utils/response.util';

export class DoctorController {

  // =========================
  // DOCTOR SCHEDULE
  // =========================

  async getSchedule(req: Request, res: Response): Promise<any> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;

      if (!clinicId || !doctorId) {
        return sendError(res, 400, 'Clinic ID and Doctor ID are required');
      }

      const schedule = await doctorService.getSchedule(clinicId, doctorId);
      return sendSuccess(res, 200, 'Doctor schedule retrieved successfully', schedule);
    } catch (error: any) {
      console.error('Error fetching doctor schedule:', error);
      return sendError(res, 500, 'Failed to fetch doctor schedule', error);
    }
  }

  async saveSchedule(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const schedules = req.body;

      if (!clinicId || !doctorId) {
        return sendError(res, 400, 'Clinic ID and Doctor ID are required');
      }

      if (!Array.isArray(schedules)) {
        return sendError(res, 400, 'Schedules must be provided as an array');
      }

      // Security check: If the user is a DOCTOR, they can only edit their OWN schedule
      // If they are a CLINIC_ADMIN, they can edit any doctor's schedule in their clinic
      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        return sendError(res, 403, 'Doctors can only modify their own schedules');
      }

      const updatedSchedule = await doctorService.saveSchedule(clinicId, doctorId, schedules);
      return sendSuccess(res, 200, 'Schedule updated successfully', { schedule: updatedSchedule });
    } catch (error: any) {
      console.error('Error saving doctor schedule:', error);
      return sendError(res, 400, 'Failed to save doctor schedule', error);
    }
  }

  // =========================
  // DOCTOR LEAVES
  // =========================

  async getLeaves(req: Request, res: Response): Promise<any> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!clinicId || !doctorId) {
        return sendError(res, 400, 'Clinic ID and Doctor ID are required');
      }

      const leaves = await doctorService.getLeaves(
        clinicId, 
        doctorId, 
        startDate, 
        endDate
      );
      
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return sendSuccess(res, 200, 'Leaves retrieved successfully', leaves);
    } catch (error: any) {
      console.error('Error fetching doctor leaves:', error);
      return sendError(res, 500, 'Failed to fetch doctor leaves', error);
    }
  }

  async saveLeaves(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const leavesData = req.body; // Array of { date: string, reason?: string }

      if (!clinicId || !doctorId) {
        return sendError(res, 400, 'Clinic ID and Doctor ID are required');
      }

      if (!Array.isArray(leavesData)) {
        return sendError(res, 400, 'Leaves data must be an array of dates');
      }

      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        return sendError(res, 403, 'Doctors can only manage their own leaves');
      }

      const savedLeaves = await doctorService.saveLeaves(clinicId, doctorId, leavesData);
      return sendSuccess(res, 200, 'Leaves saved successfully', { leaves: savedLeaves });
    } catch (error: any) {
      console.error('Error saving doctor leaves:', error);
      return sendError(res, 400, 'Failed to save doctor leaves', error);
    }
  }

  async deleteLeave(req: AuthRequest, res: Response): Promise<any> {
    try {
      const clinicId = req.params.clinicId as string;
      const leaveId = req.params.leaveId as string;

      if (!clinicId || !leaveId) {
        return sendError(res, 400, 'Clinic ID and Leave ID are required');
      }

      // We do not check doctor ownership strictly here at controller level because 
      // CLINIC_ADMIN might be deleting it. But in a full system we'd verify the 
      // requestor owns the leave or is admin.
      
      const result = await doctorService.deleteLeave(clinicId, leaveId);
      return sendSuccess(res, 200, result.message, result);
    } catch (error: any) {
      console.error('Error deleting doctor leave:', error);
      return sendError(res, 400, 'Failed to delete doctor leave', error);
    }
  }

  // =========================
  // DOCTOR PATIENT LOOKUP
  // =========================

  async getPatientDetails(req: AuthRequest, res: Response): Promise<any> {
    try {
      const doctorId = req.params.doctorId as string;
      const patientId = req.params.patientId as string;

      if (!doctorId || !patientId) {
        return sendError(res, 400, 'Doctor ID and Patient ID are required');
      }

      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        return sendError(res, 403, 'Doctors can only access patients associated with their own ID');
      }

      const patient = await doctorService.getPatientDetails(doctorId, patientId);

      if (!patient) {
        return sendError(res, 404, 'Patient not found');
      }

      return sendSuccess(res, 200, 'Patient details retrieved successfully', patient);
    } catch (error: any) {
      console.error('Error fetching patient details:', error);
      return sendError(res, 500, 'Failed to fetch patient details', error);
    }
  }
}

export const doctorController = new DoctorController();
