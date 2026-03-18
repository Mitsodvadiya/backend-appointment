import { prisma } from '../../prisma/client';
import axios from 'axios';
import { env } from '../../config/env';

export class PatientService {
  async completeProfile(patientId: string, data: any) {
    const { name, age, gender, address } = data;
    
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        name,
        age,
        gender,
        address,
      },
    });

    return updatedPatient;
  }

  async findByPhone(phone: string) {
    const patient = await prisma.patient.findUnique({
      where: { phone },
    });
    return patient;
  }

  async createPatient(data: { phone: string; name?: string; age?: number; weight?: number; gender?: any; address?: string }, otp: string) {
    // 1. Verify OTP first
    if (env.nodeEnv !== 'production') {
      if (otp !== '123456') {
        throw new Error('Invalid OTP');
      }
    } else {
      const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';
      const verificationResponse = await axios.post(
        `${MSG91_BASE_URL}/otp/verify`,
        {},
        {
          params: { otp, mobile: data.phone },
          headers: { authkey: env.msg91AuthKey },
        }
      );
      if (verificationResponse.data.type === 'error') {
        throw new Error('Invalid OTP');
      }
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { phone: data.phone },
    });

    if (existingPatient) {
      throw new Error('A patient with this phone number already exists.');
    }

    const newPatient = await prisma.patient.create({
      data,
    });

    return newPatient;
  }

  async sendUpdateOtp(patientId: string) {
    try {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new Error('Patient not found');

      if (env.nodeEnv !== 'production') {
        console.log(`[Development Mode] Mock Account Update OTP sent to ${patient.phone}`);
        return { type: 'success', message: 'Mock OTP sent successfully' };
      }

      const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';
      const response = await axios.post(
        `${MSG91_BASE_URL}/otp`,
        { template_id: env.msg91TemplateId, mobile: patient.phone },
        { headers: { authkey: env.msg91AuthKey, 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error sending update OTP:', error);
      throw new Error(error.message || 'Failed to send OTP to patient');
    }
  }

  async verifyAndUpdatePatient(patientId: string, otp: string, data: any) {
    try {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new Error('Patient not found');

      if (env.nodeEnv !== 'production') {
        if (otp !== '123456') throw new Error('Invalid OTP');
      } else {
        const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';
        const verificationResponse = await axios.post(
          `${MSG91_BASE_URL}/otp/verify`,
          {},
          {
            params: { otp, mobile: patient.phone },
            headers: { authkey: env.msg91AuthKey },
          }
        );
        if (verificationResponse.data.type === 'error') {
          throw new Error('Invalid OTP');
        }
      }

      const { name, age, weight, gender, address, phone } = data;

      const updatedPatient = await prisma.patient.update({
        where: { id: patientId },
        data: { name, age, weight, gender, address, phone },
      });

      return updatedPatient;
    } catch (error: any) {
      console.error('Error verifying OTP and updating patient:', error);
      throw new Error(error.message || 'Failed to verify OTP or update profile');
    }
  }
}

export const patientService = new PatientService();
