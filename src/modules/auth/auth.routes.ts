import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

// User Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/activate/:token', authController.activate);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Patient Auth Routes (OTP)
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/patient-refresh', authController.patientRefresh);

export default router;
