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

router.post(
  '/:id/invite',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN']),
  clinicController.inviteMember
);

router.post(
  '/activate-member',
  clinicController.activateMember
);

router.get(
  '/:id/members',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN']),
  clinicController.getMembers
);

router.patch(
  '/:id/members/:userId/status',
  authenticateJWT,
  authorizeRoles(['CLINIC_ADMIN']),
  clinicController.updateMemberStatus
);

export default router;
