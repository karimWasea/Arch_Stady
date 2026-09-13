// ============================================================
// Domain Layer — Clinical Models
// Pure TypeScript interfaces, zero Angular dependencies
// ============================================================

import { AppointmentStatus } from '../enums/enums';

// ── Patient ──────────────────────────────────────────────────
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

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

export interface UpdatePatientDto extends CreatePatientDto {}

// ── Doctor ───────────────────────────────────────────────────
export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  specialization: string;
  phone: string;
  email: string;
  departmentId: number;
  departmentName: string;
  createdAt: string;
}

export interface CreateDoctorDto {
  firstName: string;
  lastName: string;
  specialization: string;
  phone: string;
  email: string;
  departmentId: number;
}

export interface UpdateDoctorDto extends CreateDoctorDto {}

// ── Department ───────────────────────────────────────────────
export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
}

export interface UpdateDepartmentDto extends CreateDepartmentDto {}

// ── Appointment ──────────────────────────────────────────────
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

export interface CreateAppointmentDto {
  patientId: number;
  doctorId: number;
  appointmentDate: string;
  notes?: string;
}

export interface UpdateAppointmentDto {
  appointmentDate: string;
  status: AppointmentStatus;
  notes?: string;
}

// ── Medical Record ───────────────────────────────────────────
export interface MedicalRecord {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  notes?: string;
  createdAt: string;
}

export interface CreateMedicalRecordDto {
  patientId: number;
  doctorId: number;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  notes?: string;
}

export interface UpdateMedicalRecordDto {
  diagnosis: string;
  symptoms: string;
  treatment: string;
  notes?: string;
}

// ── Prescription ─────────────────────────────────────────────
export interface PrescriptionItem {
  id: number;
  prescriptionId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface CreatePrescriptionItemDto {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentId?: number;
  prescriptionDate: string;
  notes?: string;
  createdAt: string;
  items: PrescriptionItem[];
}

export interface CreatePrescriptionDto {
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  notes?: string;
  items: CreatePrescriptionItemDto[];
}

export interface UpdatePrescriptionDto {
  notes?: string;
  items: CreatePrescriptionItemDto[];
}
