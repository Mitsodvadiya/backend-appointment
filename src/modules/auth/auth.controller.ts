import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  // =========================
  // USER (WEB PORTAL) AUTHENTICATION
  // =========================

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
      }

      const response = await authService.register(name, email, password);
      res.status(201).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to register' });
    }
  }

  async activate(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token as string;
      if (!token) {
        res.status(400).json({ error: 'Activation token is required' });
        return;
      }

      const response = await authService.activate(token);
      
      const { refreshToken, ...responseData } = response;
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(responseData);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to activate account' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const response = await authService.login(email, password);
      
      const { refreshToken, ...responseData } = response;

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(responseData);
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Login failed' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token not found' });
        return;
      }

      const response = await authService.refreshUserToken(refreshToken);
      
      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({ token: response.token });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Invalid refresh token' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  }

  // =========================
  // PASSWORD RESET METHODS
  // =========================

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const response = await authService.forgotPassword(email);
      res.status(200).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to process forgot password request' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long' });
        return;
      }

      const response = await authService.resetPassword(token, newPassword);
      res.status(200).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
  }

  // =========================
  // PATIENT (APP) AUTHENTICATION
  // =========================

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

  async patientRefresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token is required in the request body' });
        return;
      }

      const response = await authService.refreshPatientToken(refreshToken);
      res.status(200).json(response);
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Invalid refresh token' });
    }
  }
}

export const authController = new AuthController();
