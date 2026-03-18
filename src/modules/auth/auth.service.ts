import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../prisma/client';
import { emailService } from '../../common/utils/email.service';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

export class AuthService {
  // =========================
  // TOKEN GENERATION HELPER
  // =========================
  private generateTokens(payload: object, expiresIn: string = env.jwtExpiresIn, refreshExpiresIn: string = env.jwtRefreshExpiresIn) {
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: expiresIn as any });
    const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: refreshExpiresIn as any });
    return { token, refreshToken };
  }

  // =========================
  // USER (WEB PORTAL) AUTHENTICATION
  // =========================

  async register(name: string, email: string, passwordRaw: string) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('Email is already registered');
      }

      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      
      // We'll create the user first to capture their true updatedAt timestamp
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'CLINIC_ADMIN', // Defaulting to an admin for web portal registration
          isActive: false,
        },
      });

      // Instead of saving token to DB, issue a short-lived JWT that embeds the email and token version
      const activationToken = jwt.sign(
        { email, tokenVer: user.updatedAt.getTime() },
        env.jwtSecret,
        { expiresIn: '1d' } // 1 day expiration for activation links
      );

      await emailService.sendActivationEmail(user.email!, activationToken);

      return { message: 'Registration successful. Please check your email to activate your account.' };
    } catch (error: any) {
      console.error('Error during registration:', error);
      throw new Error(error.message || 'Failed to register user');
    }
  }

  async activate(token: string) {
    try {
      // Decode the token to get the email since it's not stored in the DB anymore
      // We'll modify the register method to send a JWT token via email instead of a random string.
      const decoded: any = jwt.verify(token, env.jwtSecret);
      
      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.deletedAt) {
        throw new Error('Account does not exist or has been deleted');
      }

      if (decoded.tokenVer && user.updatedAt.getTime() !== decoded.tokenVer) {
        throw new Error('This activation link has expired because a newer one was requested.');
      }

      if (user.isActive) {
        throw new Error('Account is already activated');
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
        },
        include: {
          clinicMembers: {
            include: { clinic: true },
          },
        },
      });

      const tokens = this.generateTokens({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role 
      });

      return {
        message: 'Account activated successfully',
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
        clinic: updatedUser.clinicMembers?.[0]?.clinic || null,
      };
    } catch (error: any) {
      console.error('Error during activation:', error);
      if (error.name === 'TokenExpiredError') {
         throw new Error('Activation link has expired. Please request a new one.');
      }
      throw new Error(error.message || 'Failed to activate account');
    }
  }

  async resendActivation(email: string) {
    try {
      let user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || user.deletedAt) {
        // Return generic success to prevent email enumeration, or throw error depending on spec
        throw new Error('User not found');
      }

      if (user.isActive) {
        throw new Error('Account is already activated');
      }

      // Force an update to the user's updatedAt field natively in Postgres.
      // This instantly invalidates any old JWTs that carried the previous updatedAt timestamp!
      user = await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      });

      const activationToken = jwt.sign(
        { email: user.email, tokenVer: user.updatedAt.getTime() },
        env.jwtSecret,
        { expiresIn: '1d' }
      );

      await emailService.sendActivationEmail(user.email!, activationToken);

      return { message: 'A new activation link has been sent to your email.' };
    } catch (error: any) {
      console.error('Error resending activation:', error);
      throw new Error(error.message || 'Failed to resend activation link');
    }
  }

  async login(email: string, passwordRaw: string) {
    try {
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: {
          clinicMembers: {
            include: { clinic: true },
          },
        },
      });

      if (!user || user.deletedAt || !user.password) {
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        throw new Error('Please activate your account before logging in');
      }

      const isPasswordValid = await bcrypt.compare(passwordRaw, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const tokens = this.generateTokens({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      return {
        message: 'Login successful',
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        clinic: user.clinicMembers?.[0]?.clinic || null,
      };
    } catch (error: any) {
      console.error('Error during login:', error);
      throw new Error(error.message || 'Failed to login');
    }
  }

  // =========================
  // PATIENT (APP) AUTHENTICATION
  // =========================

  async sendOtp(phone: string) {
    try {
      if (env.nodeEnv !== 'production') {
        console.log(`[Development Mode] Mock OTP sent to ${phone}`);
        return { type: 'success', message: 'Mock OTP sent successfully' };
      }

      const response = await axios.post(
        `${MSG91_BASE_URL}/otp`,
        {
          template_id: env.msg91TemplateId,
          mobile: phone,
        },
        {
          headers: {
            authkey: env.msg91AuthKey,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP');
    }
  }

  async verifyOtp(phone: string, otp: string) {
    try {
      if (env.nodeEnv !== 'production') {
        // In development, assume '123456' is the valid dummy OTP
        if (otp !== '123456') {
          throw new Error('Invalid OTP');
        }
        console.log(`[Development Mode] Mock OTP verified for ${phone}`);
      } else {
        const verificationResponse = await axios.post(
          `${MSG91_BASE_URL}/otp/verify`,
          {},
          {
            params: { otp, mobile: phone },
            headers: { authkey: env.msg91AuthKey },
          }
        );

        const data = verificationResponse.data;
        if (data.type === 'error') {
          throw new Error('Invalid OTP');
        }
      }

      let patient = await prisma.patient.findUnique({
        where: { phone },
      });

      if (!patient) {
        patient = await prisma.patient.create({
          data: { phone },
        });
      }

      const tokens = this.generateTokens(
        { id: patient.id, phone: patient.phone },
        '7d',
        '30d'
      );

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        patient,
      };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }
  // =========================
  // PASSWORD RESET METHODS
  // =========================

  async forgotPassword(email: string) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || user.deletedAt || (!user.isActive && user.role !== 'SUPER_ADMIN')) {
        // Return a generic success message to prevent email enumeration attacks
        return { message: 'If that email is registered, a password reset link has been sent.' };
      }

      // Generate a short-lived token using the existing JWT_SECRET
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'password_reset' },
        env.jwtSecret,
        { expiresIn: '15m' }
      );

      await emailService.sendPasswordResetEmail(user.email!, resetToken);

      return { message: 'If that email is registered, a password reset link has been sent.' };
    } catch (error: any) {
      console.error('Error during forgot password:', error);
      throw new Error(error.message || 'Failed to process forgot password request');
    }
  }

  async resetPassword(token: string, newPasswordRaw: string) {
    try {
      // Decode and verify the token
      const decoded: any = jwt.verify(token, env.jwtSecret);
      
      // Ensure this token was specifically generated for password reset
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.deletedAt) {
        throw new Error('User not found');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

      // Update the user's password in the database
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { message: 'Password has been successfully reset' };
    } catch (error: any) {
      console.error('Error during password reset:', error);
      if (error.name === 'TokenExpiredError') {
         throw new Error('Password reset link has expired. Please request a new one.');
      }
      throw new Error(error.message || 'Failed to reset password. The link may be invalid.');
    }
  }

  // =========================
  // REFRESH TOKEN METHODS
  // =========================

  async refreshUserToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, env.jwtRefreshSecret);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.deletedAt || (!user.isActive && user.role !== 'SUPER_ADMIN')) {
        throw new Error('User not found or account inactive');
      }

      // Generate a new set of tokens (Rotates the refresh token securely)
      const tokens = this.generateTokens({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      console.error('Error refreshing user token:', error);
      throw new Error(error.message || 'Invalid or expired refresh token');
    }
  }

  async refreshPatientToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, env.jwtRefreshSecret);
      
      const patient = await prisma.patient.findUnique({
        where: { id: decoded.id },
      });

      if (!patient || patient.deletedAt) {
        throw new Error('Patient not found');
      }

      const tokens = this.generateTokens(
        { id: patient.id, phone: patient.phone },
        '7d',
        '30d'
      );

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      console.error('Error refreshing patient token:', error);
      throw new Error(error.message || 'Invalid or expired refresh token');
    }
  }

  // =========================
  // USER PROFILE METHODS
  // =========================

  async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          clinicMembers: {
            include: {
              clinic: true,
            },
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new Error('User not found');
      }

      // Exclude password from the returned profile
      const { password, ...userProfile } = user;

      return {
        user: userProfile,
        clinic: userProfile.clinicMembers?.[0]?.clinic || null,
      };
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      throw new Error(error.message || 'Failed to fetch user profile');
    }
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || user.deletedAt) {
        throw new Error('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name !== undefined ? data.name : user.name,
          phone: data.phone !== undefined ? data.phone : user.phone,
        },
        include: {
          clinicMembers: {
            include: {
              clinic: true,
            },
          },
        },
      });

      const { password, ...userProfile } = updatedUser;

      return {
        message: 'Profile updated successfully',
        user: userProfile,
      };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update user profile');
    }
  }
}

export const authService = new AuthService();
