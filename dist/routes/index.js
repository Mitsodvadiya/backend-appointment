import { Router } from 'express';
// import authRoutes from '../modules/auth/auth.routes';
const router = Router();
// router.use('/auth', authRoutes);
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
export default router;
