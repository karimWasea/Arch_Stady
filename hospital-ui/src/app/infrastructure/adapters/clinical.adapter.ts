// ============================================================
// Infrastructure Layer — Clinical Adapter
// Concrete implementation of ClinicalServicePort
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClinicalServicePort } from '../../application/ports/clinical.port';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Patient, CreatePatientDto, UpdatePatientDto,
  Doctor, CreateDoctorDto, UpdateDoctorDto,
  Department, CreateDepartmentDto, UpdateDepartmentDto,
  Appointment, CreateAppointmentDto, UpdateAppointmentDto,
  MedicalRecord, CreateMedicalRecordDto, UpdateMedicalRecordDto,
  Prescription, CreatePrescriptionDto, UpdatePrescriptionDto
} from '../../domain/models/clinical.models';

@Injectable()
export class ClinicalAdapter extends ClinicalServicePort {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ── Patients ─────────────────────────────────────────────
  getPatients(): Observable<ApiResponse<Patient[]>> {
    return this.http.get<ApiResponse<Patient[]>>(`${this.api}/patients`);
  }
  getPatient(id: number): Observable<ApiResponse<Patient>> {
    return this.http.get<ApiResponse<Patient>>(`${this.api}/patients/${id}`);
  }
  createPatient(dto: CreatePatientDto): Observable<ApiResponse<Patient>> {
    return this.http.post<ApiResponse<Patient>>(`${this.api}/patients`, dto);
  }
  updatePatient(id: number, dto: UpdatePatientDto): Observable<ApiResponse<Patient>> {
    return this.http.put<ApiResponse<Patient>>(`${this.api}/patients/${id}`, dto);
  }
  deletePatient(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/patients/${id}`);
  }

  // ── Doctors ──────────────────────────────────────────────
  getDoctors(): Observable<ApiResponse<Doctor[]>> {
    return this.http.get<ApiResponse<Doctor[]>>(`${this.api}/doctors`);
  }
  getDoctor(id: number): Observable<ApiResponse<Doctor>> {
    return this.http.get<ApiResponse<Doctor>>(`${this.api}/doctors/${id}`);
  }
  createDoctor(dto: CreateDoctorDto): Observable<ApiResponse<Doctor>> {
    return this.http.post<ApiResponse<Doctor>>(`${this.api}/doctors`, dto);
  }
  updateDoctor(id: number, dto: UpdateDoctorDto): Observable<ApiResponse<Doctor>> {
    return this.http.put<ApiResponse<Doctor>>(`${this.api}/doctors/${id}`, dto);
  }
  deleteDoctor(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/doctors/${id}`);
  }

  // ── Departments ──────────────────────────────────────────
  getDepartments(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.api}/departments`);
  }
  getDepartment(id: number): Observable<ApiResponse<Department>> {
    return this.http.get<ApiResponse<Department>>(`${this.api}/departments/${id}`);
  }
  createDepartment(dto: CreateDepartmentDto): Observable<ApiResponse<Department>> {
    return this.http.post<ApiResponse<Department>>(`${this.api}/departments`, dto);
  }
  updateDepartment(id: number, dto: UpdateDepartmentDto): Observable<ApiResponse<Department>> {
    return this.http.put<ApiResponse<Department>>(`${this.api}/departments/${id}`, dto);
  }
  deleteDepartment(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/departments/${id}`);
  }

  // ── Appointments ─────────────────────────────────────────
  getAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.api}/appointments`);
  }
  getAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.get<ApiResponse<Appointment>>(`${this.api}/appointments/${id}`);
  }
  createAppointment(dto: CreateAppointmentDto): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.api}/appointments`, dto);
  }
  updateAppointment(id: number, dto: UpdateAppointmentDto): Observable<ApiResponse<Appointment>> {
    return this.http.put<ApiResponse<Appointment>>(`${this.api}/appointments/${id}`, dto);
  }
  completeAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.api}/appointments/${id}/complete`, {});
  }
  cancelAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.api}/appointments/${id}/cancel`, {});
  }
  deleteAppointment(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/appointments/${id}`);
  }

  // ── Medical Records ──────────────────────────────────────
  getMedicalRecords(): Observable<ApiResponse<MedicalRecord[]>> {
    return this.http.get<ApiResponse<MedicalRecord[]>>(`${this.api}/medicalrecords`);
  }
  getMedicalRecordsByPatient(patientId: number): Observable<ApiResponse<MedicalRecord[]>> {
    return this.http.get<ApiResponse<MedicalRecord[]>>(`${this.api}/medicalrecords/patient/${patientId}`);
  }
  getMedicalRecord(id: number): Observable<ApiResponse<MedicalRecord>> {
    return this.http.get<ApiResponse<MedicalRecord>>(`${this.api}/medicalrecords/${id}`);
  }
  createMedicalRecord(dto: CreateMedicalRecordDto): Observable<ApiResponse<MedicalRecord>> {
    return this.http.post<ApiResponse<MedicalRecord>>(`${this.api}/medicalrecords`, dto);
  }
  updateMedicalRecord(id: number, dto: UpdateMedicalRecordDto): Observable<ApiResponse<MedicalRecord>> {
    return this.http.put<ApiResponse<MedicalRecord>>(`${this.api}/medicalrecords/${id}`, dto);
  }

  // ── Prescriptions ────────────────────────────────────────
  getPrescriptions(): Observable<ApiResponse<Prescription[]>> {
    return this.http.get<ApiResponse<Prescription[]>>(`${this.api}/prescriptions`);
  }
  getPrescriptionsByPatient(patientId: number): Observable<ApiResponse<Prescription[]>> {
    return this.http.get<ApiResponse<Prescription[]>>(`${this.api}/prescriptions/patient/${patientId}`);
  }
  getPrescription(id: number): Observable<ApiResponse<Prescription>> {
    return this.http.get<ApiResponse<Prescription>>(`${this.api}/prescriptions/${id}`);
  }
  createPrescription(dto: CreatePrescriptionDto): Observable<ApiResponse<Prescription>> {
    return this.http.post<ApiResponse<Prescription>>(`${this.api}/prescriptions`, dto);
  }
  updatePrescription(id: number, dto: UpdatePrescriptionDto): Observable<ApiResponse<Prescription>> {
    return this.http.put<ApiResponse<Prescription>>(`${this.api}/prescriptions/${id}`, dto);
  }
}
