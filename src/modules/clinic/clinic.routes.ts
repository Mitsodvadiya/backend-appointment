import { Router } from 'express';
import { clinicController } from './clinic.controller';
import { authenticateJWT } from '../../common/middleware/auth.middleware';
import { authorizeRoles } from '../../common/middleware/role.middleware';

const router = Router();

router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN']),
  clinicController.createClinic
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN']),
  clinicController.updateClinic
);

export default router;
