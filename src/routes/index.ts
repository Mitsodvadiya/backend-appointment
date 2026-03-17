import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import patientRoutes from '../modules/patient/patient.routes';
import clinicRoutes from '../modules/clinic/clinic.routes';
import doctorRoutes from '../modules/doctor/doctor.routes';
import queueRoutes from '../modules/queue/queue.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patient', patientRoutes);
router.use('/clinic', clinicRoutes);
router.use('/doctor', doctorRoutes);
router.use('/queue', queueRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
