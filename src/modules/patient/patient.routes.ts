import { Router } from 'express';
import { patientController } from './patient.controller';
import { authenticateJWT } from '../../common/middleware/auth.middleware';

const router = Router();

router.patch('/complete-profile', authenticateJWT, patientController.completeProfile);

export default router;
