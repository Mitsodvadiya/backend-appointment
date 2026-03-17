import { Router } from 'express';
import { doctorController } from './doctor.controller';
import { authenticateJWT } from '../../common/middleware/auth.middleware';
import { authorizeRoles } from '../../common/middleware/role.middleware';

const router = Router();

// =========================
// SCHEDULE ROUTES
// =========================

// Publicly or Authenticated accessible (Patients need to see it, Doctors need to see it)
router.get(
  '/:clinicId/:doctorId/schedule',
  authenticateJWT,
  doctorController.getSchedule
);

// Protected: Only CLINIC_ADMIN or the respective DOCTOR can modify
router.post(
  '/:clinicId/:doctorId/schedule',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN', 'DOCTOR']),
  doctorController.saveSchedule
);

// =========================
// LEAVES ROUTES
// =========================

// Publicly or Authenticated accessible
router.get(
  '/:clinicId/:doctorId/leaves',
  authenticateJWT,
  doctorController.getLeaves
);

// Protected: Only CLINIC_ADMIN or the respective DOCTOR can modify
router.post(
  '/:clinicId/:doctorId/leaves',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN', 'DOCTOR']),
  doctorController.saveLeaves
);

router.delete(
  '/:clinicId/leaves/:leaveId',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN', 'DOCTOR']),
  doctorController.deleteLeave
);

// =========================
// PATIENT DETAILS
// =========================

router.get(
  '/:doctorId/patient/:patientId',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN', 'DOCTOR']),
  doctorController.getPatientDetails
);

export default router;
