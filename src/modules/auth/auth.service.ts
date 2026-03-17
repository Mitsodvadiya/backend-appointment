import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../prisma/client';
const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

export class AuthService {
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

      const token = jwt.sign(
        { id: patient.id, phone: patient.phone },
        env.jwtSecret,
        { expiresIn: '7d' }
      );

      const redirectTo = (!patient.name || patient.name.trim() === '') ? 'ONBOARDING' : 'DASHBOARD';

      return {
        token,
        redirectTo,
        patient,
      };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }
}

export const authService = new AuthService();
