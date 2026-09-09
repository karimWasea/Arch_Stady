import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Appointment, CreateAppointment, CreatePatient, Department, Doctor, Patient } from '../models/hospital.models';

@Injectable({
  providedIn: 'root'
})
export class HospitalService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Departments
  getDepartments(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.baseUrl}/departments`);
  }

  // Doctors
  getDoctors(): Observable<ApiResponse<Doctor[]>> {
    return this.http.get<ApiResponse<Doctor[]>>(`${this.baseUrl}/doctors`);
  }

  // Patients
  getPatients(): Observable<ApiResponse<Patient[]>> {
    return this.http.get<ApiResponse<Patient[]>>(`${this.baseUrl}/patients`);
  }

  getPatient(id: number): Observable<ApiResponse<Patient>> {
    return this.http.get<ApiResponse<Patient>>(`${this.baseUrl}/patients/${id}`);
  }

  createPatient(dto: CreatePatient): Observable<ApiResponse<Patient>> {
    return this.http.post<ApiResponse<Patient>>(`${this.baseUrl}/patients`, dto);
  }

  // Appointments
  getAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.baseUrl}/appointments`);
  }

  createAppointment(dto: CreateAppointment): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/appointments`, dto);
  }

  completeAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/appointments/${id}/complete`, {});
  }

  cancelAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/appointments/${id}/cancel`, {});
  }
}
