import { prisma } from '../../prisma/client';

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
}

export const patientService = new PatientService();
