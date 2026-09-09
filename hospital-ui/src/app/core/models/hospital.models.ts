export enum AppointmentStatus {
  Scheduled = 1,
  Completed = 2,
  Cancelled = 3
}

export interface Department {
  id: number;
  name: string;
  description: string;
  doctorsCount: number;
}

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  specialization: string;
  phone: string;
  email: string;
  departmentId: number;
  departmentName?: string;
  createdAt: string;
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface CreatePatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentDate: string;
  status: AppointmentStatus;
  statusName: string;
  notes?: string;
  createdAt: string;
}

export interface CreateAppointment {
  patientId: number;
  doctorId: number;
  appointmentDate: string;
  notes?: string;
}
