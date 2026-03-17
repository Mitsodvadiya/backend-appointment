import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }

      const response = await authService.sendOtp(phone);
      res.status(200).json({ message: 'OTP sent successfully', data: response });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send OTP' });
    }
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ error: 'Phone number and OTP are required' });
        return;
      }

      const result = await authService.verifyOtp(phone, otp);
      
      res.status(200).json({
        message: 'OTP verified successfully',
        ...result
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to verify OTP' });
    }
  }
}

export const authController = new AuthController();
