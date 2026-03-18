import { Router } from 'express';
import { patientController } from './patient.controller';
import { authenticateJWT } from '../../common/middleware/auth.middleware';
import { authorizeRoles } from '../../common/middleware/role.middleware';

const router = Router();

router.patch('/complete-profile', authenticateJWT, patientController.completeProfile);
router.get('/search', authenticateJWT, authorizeRoles(['CLINIC_ADMIN', 'DOCTOR', 'STAFF']), patientController.getPatientByPhone);
router.post('/', authenticateJWT, authorizeRoles(['CLINIC_ADMIN', 'DOCTOR', 'STAFF']), patientController.createPatient);
router.post('/:patientId/send-update-otp', authenticateJWT, authorizeRoles(['CLINIC_ADMIN', 'DOCTOR', 'STAFF']), patientController.sendUpdateOtp);
router.patch('/:patientId/update', authenticateJWT, authorizeRoles(['CLINIC_ADMIN', 'DOCTOR', 'STAFF']), patientController.updatePatient);

export default router;
