import { Request, Response } from 'express';
import { doctorService } from './doctor.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class DoctorController {

  // =========================
  // DOCTOR SCHEDULE
  // =========================

  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;

      if (!clinicId || !doctorId) {
        res.status(400).json({ error: 'Clinic ID and Doctor ID are required' });
        return;
      }

      const schedule = await doctorService.getSchedule(clinicId, doctorId);
      res.status(200).json(schedule);
    } catch (error: any) {
      console.error('Error fetching doctor schedule:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch doctor schedule' });
    }
  }

  async saveSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const schedules = req.body;

      if (!clinicId || !doctorId) {
        res.status(400).json({ error: 'Clinic ID and Doctor ID are required' });
        return;
      }

      if (!Array.isArray(schedules)) {
        res.status(400).json({ error: 'Schedules must be provided as an array' });
        return;
      }

      // Security check: If the user is a DOCTOR, they can only edit their OWN schedule
      // If they are a CLINIC_ADMIN, they can edit any doctor's schedule in their clinic
      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        res.status(403).json({ error: 'Doctors can only modify their own schedules' });
        return;
      }

      const updatedSchedule = await doctorService.saveSchedule(clinicId, doctorId, schedules);
      res.status(200).json({ message: 'Schedule updated successfully', schedule: updatedSchedule });
    } catch (error: any) {
      console.error('Error saving doctor schedule:', error);
      res.status(400).json({ error: error.message || 'Failed to save doctor schedule' });
    }
  }

  // =========================
  // DOCTOR LEAVES
  // =========================

  async getLeaves(req: Request, res: Response): Promise<void> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!clinicId || !doctorId) {
        res.status(400).json({ error: 'Clinic ID and Doctor ID are required' });
        return;
      }

      const leaves = await doctorService.getLeaves(
        clinicId, 
        doctorId, 
        startDate, 
        endDate
      );
      
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.status(200).json(leaves);
    } catch (error: any) {
      console.error('Error fetching doctor leaves:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch doctor leaves' });
    }
  }

  async saveLeaves(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.clinicId as string;
      const doctorId = req.params.doctorId as string;
      const leavesData = req.body; // Array of { date: string, reason?: string }

      if (!clinicId || !doctorId) {
        res.status(400).json({ error: 'Clinic ID and Doctor ID are required' });
        return;
      }

      if (!Array.isArray(leavesData)) {
        res.status(400).json({ error: 'Leaves data must be an array of dates' });
        return;
      }

      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        res.status(403).json({ error: 'Doctors can only manage their own leaves' });
        return;
      }

      const savedLeaves = await doctorService.saveLeaves(clinicId, doctorId, leavesData);
      res.status(200).json({ message: 'Leaves saved successfully', leaves: savedLeaves });
    } catch (error: any) {
      console.error('Error saving doctor leaves:', error);
      res.status(400).json({ error: error.message || 'Failed to save doctor leaves' });
    }
  }

  async deleteLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.params.clinicId as string;
      const leaveId = req.params.leaveId as string;

      if (!clinicId || !leaveId) {
        res.status(400).json({ error: 'Clinic ID and Leave ID are required' });
        return;
      }

      // We do not check doctor ownership strictly here at controller level because 
      // CLINIC_ADMIN might be deleting it. But in a full system we'd verify the 
      // requestor owns the leave or is admin.
      
      const result = await doctorService.deleteLeave(clinicId, leaveId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error deleting doctor leave:', error);
      res.status(400).json({ error: error.message || 'Failed to delete doctor leave' });
    }
  }

  // =========================
  // DOCTOR PATIENT LOOKUP
  // =========================

  async getPatientDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.params.doctorId as string;
      const patientId = req.params.patientId as string;

      if (!doctorId || !patientId) {
        res.status(400).json({ error: 'Doctor ID and Patient ID are required' });
        return;
      }

      const currentUser = req.user;
      if (currentUser.role === 'DOCTOR' && currentUser.id !== doctorId) {
        res.status(403).json({ error: 'Doctors can only access patients associated with their own ID' });
        return;
      }

      const patient = await doctorService.getPatientDetails(doctorId, patientId);

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.status(200).json(patient);
    } catch (error: any) {
      console.error('Error fetching patient details:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch patient details' });
    }
  }
}

export const doctorController = new DoctorController();
