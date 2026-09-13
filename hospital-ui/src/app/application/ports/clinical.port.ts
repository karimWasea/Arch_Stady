// ============================================================
// Application Layer — Clinical Service Port
// Abstract contract for all clinical operations
// ============================================================

import { Observable } from 'rxjs';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Patient, CreatePatientDto, UpdatePatientDto,
  Doctor, CreateDoctorDto, UpdateDoctorDto,
  Department, CreateDepartmentDto, UpdateDepartmentDto,
  Appointment, CreateAppointmentDto, UpdateAppointmentDto,
  MedicalRecord, CreateMedicalRecordDto, UpdateMedicalRecordDto,
  Prescription, CreatePrescriptionDto, UpdatePrescriptionDto
} from '../../domain/models/clinical.models';

export abstract class ClinicalServicePort {
  // ── Patients ─────────────────────────────────────────────
  abstract getPatients(): Observable<ApiResponse<Patient[]>>;
  abstract getPatient(id: number): Observable<ApiResponse<Patient>>;
  abstract createPatient(dto: CreatePatientDto): Observable<ApiResponse<Patient>>;
  abstract updatePatient(id: number, dto: UpdatePatientDto): Observable<ApiResponse<Patient>>;
  abstract deletePatient(id: number): Observable<ApiResponse<void>>;

  // ── Doctors ──────────────────────────────────────────────
  abstract getDoctors(): Observable<ApiResponse<Doctor[]>>;
  abstract getDoctor(id: number): Observable<ApiResponse<Doctor>>;
  abstract createDoctor(dto: CreateDoctorDto): Observable<ApiResponse<Doctor>>;
  abstract updateDoctor(id: number, dto: UpdateDoctorDto): Observable<ApiResponse<Doctor>>;
  abstract deleteDoctor(id: number): Observable<ApiResponse<void>>;

  // ── Departments ──────────────────────────────────────────
  abstract getDepartments(): Observable<ApiResponse<Department[]>>;
  abstract getDepartment(id: number): Observable<ApiResponse<Department>>;
  abstract createDepartment(dto: CreateDepartmentDto): Observable<ApiResponse<Department>>;
  abstract updateDepartment(id: number, dto: UpdateDepartmentDto): Observable<ApiResponse<Department>>;
  abstract deleteDepartment(id: number): Observable<ApiResponse<void>>;

  // ── Appointments ─────────────────────────────────────────
  abstract getAppointments(): Observable<ApiResponse<Appointment[]>>;
  abstract getAppointment(id: number): Observable<ApiResponse<Appointment>>;
  abstract createAppointment(dto: CreateAppointmentDto): Observable<ApiResponse<Appointment>>;
  abstract updateAppointment(id: number, dto: UpdateAppointmentDto): Observable<ApiResponse<Appointment>>;
  abstract completeAppointment(id: number): Observable<ApiResponse<Appointment>>;
  abstract cancelAppointment(id: number): Observable<ApiResponse<Appointment>>;
  abstract deleteAppointment(id: number): Observable<ApiResponse<void>>;

  // ── Medical Records ──────────────────────────────────────
  abstract getMedicalRecords(): Observable<ApiResponse<MedicalRecord[]>>;
  abstract getMedicalRecordsByPatient(patientId: number): Observable<ApiResponse<MedicalRecord[]>>;
  abstract getMedicalRecord(id: number): Observable<ApiResponse<MedicalRecord>>;
  abstract createMedicalRecord(dto: CreateMedicalRecordDto): Observable<ApiResponse<MedicalRecord>>;
  abstract updateMedicalRecord(id: number, dto: UpdateMedicalRecordDto): Observable<ApiResponse<MedicalRecord>>;

  // ── Prescriptions ────────────────────────────────────────
  abstract getPrescriptions(): Observable<ApiResponse<Prescription[]>>;
  abstract getPrescriptionsByPatient(patientId: number): Observable<ApiResponse<Prescription[]>>;
  abstract getPrescription(id: number): Observable<ApiResponse<Prescription>>;
  abstract createPrescription(dto: CreatePrescriptionDto): Observable<ApiResponse<Prescription>>;
  abstract updatePrescription(id: number, dto: UpdatePrescriptionDto): Observable<ApiResponse<Prescription>>;
}
