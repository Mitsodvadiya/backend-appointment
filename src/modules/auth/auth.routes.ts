import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateJWT } from '../../common/middleware/auth.middleware';

const router = Router();

// User Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/activate/:token', authController.activate);
router.post('/resend-activation', authController.resendActivation);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// User Profile Routes
router.get('/me', authenticateJWT, authController.me);
router.patch('/me', authenticateJWT, authController.updateProfile);

// Patient Auth Routes (OTP)
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/patient-refresh', authController.patientRefresh);

export default router;
