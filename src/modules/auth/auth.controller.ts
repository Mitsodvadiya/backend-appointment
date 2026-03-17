import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { sendSuccess, sendError } from '../../common/utils/response.util';

export class AuthController {
  // =========================
  // USER (WEB PORTAL) AUTHENTICATION
  // =========================

  async register(req: Request, res: Response): Promise<any> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 400, 'Name, email, and password are required');
      }

      const response = await authService.register(name, email, password);
      return sendSuccess(res, 201, response.message, response);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to register', error);
    }
  }

  async activate(req: Request, res: Response): Promise<any> {
    try {
      const token = req.params.token as string;
      if (!token) {
        return sendError(res, 400, 'Activation token is required');
      }

      const response = await authService.activate(token);
      
      const { refreshToken, message, ...responseData } = response;
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, 200, message, responseData);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to activate account', error);
    }
  }

  async login(req: Request, res: Response): Promise<any> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required');
      }

      const response = await authService.login(email, password);
      
      const { refreshToken, message, ...responseData } = response;

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, 200, message, responseData);
    } catch (error: any) {
      return sendError(res, 401, error.message || 'Login failed', error);
    }
  }

  async refresh(req: Request, res: Response): Promise<any> {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return sendError(res, 401, 'Refresh token not found');
      }

      const response = await authService.refreshUserToken(refreshToken);
      
      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, 200, 'Token refreshed', { token: response.token });
    } catch (error: any) {
      return sendError(res, 401, error.message || 'Invalid refresh token', error);
    }
  }

  async logout(req: Request, res: Response): Promise<any> {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      return sendSuccess(res, 200, 'Logged out successfully');
    } catch (error: any) {
      return sendError(res, 500, 'Logout failed', error);
    }
  }

  // =========================
  // PASSWORD RESET METHODS
  // =========================

  async forgotPassword(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;
      if (!email) {
        return sendError(res, 400, 'Email is required');
      }

      const response = await authService.forgotPassword(email);
      return sendSuccess(res, 200, response.message, response);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to process forgot password request', error);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<any> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return sendError(res, 400, 'Token and new password are required');
      }

      if (newPassword.length < 6) {
        return sendError(res, 400, 'Password must be at least 6 characters long');
      }

      const response = await authService.resetPassword(token, newPassword);
      return sendSuccess(res, 200, response.message, response);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to reset password', error);
    }
  }

  // =========================
  // PATIENT (APP) AUTHENTICATION
  // =========================

  async sendOtp(req: Request, res: Response): Promise<any> {
    try {
      const { phone } = req.body;
      if (!phone) {
        return sendError(res, 400, 'Phone number is required');
      }

      const response = await authService.sendOtp(phone);
      return sendSuccess(res, 200, 'OTP sent successfully', response);
    } catch (error: any) {
      return sendError(res, 500, error.message || 'Failed to send OTP', error);
    }
  }

  async verifyOtp(req: Request, res: Response): Promise<any> {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return sendError(res, 400, 'Phone number and OTP are required');
      }

      const result = await authService.verifyOtp(phone, otp);
      
      return sendSuccess(res, 200, 'OTP verified successfully', result);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to verify OTP', error);
    }
  }

  async patientRefresh(req: Request, res: Response): Promise<any> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return sendError(res, 401, 'Refresh token is required in the request body');
      }

      const response = await authService.refreshPatientToken(refreshToken);
      return sendSuccess(res, 200, 'Token refreshed successfully', response);
    } catch (error: any) {
      return sendError(res, 401, error.message || 'Invalid refresh token', error);
    }
  }

  // =========================
  // USER PROFILE METHODS
  // =========================

  async me(req: AuthRequest, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return sendError(res, 401, 'Unauthorized');
      }

      const response = await authService.getProfile(userId);
      return sendSuccess(res, 200, 'Profile fetched successfully', response);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to fetch profile', error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { name, phone } = req.body;

      if (!userId) {
        return sendError(res, 401, 'Unauthorized');
      }

      const response = await authService.updateProfile(userId, { name, phone });
      return sendSuccess(res, 200, response.message, response.user);
    } catch (error: any) {
      return sendError(res, 400, error.message || 'Failed to update profile', error);
    }
  }
}

export const authController = new AuthController();
