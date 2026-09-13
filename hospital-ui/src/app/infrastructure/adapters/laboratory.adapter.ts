// ============================================================
// Infrastructure Layer — Laboratory Adapter
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LaboratoryServicePort } from '../../application/ports/laboratory.port';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  LabTest, CreateLabTestDto, UpdateLabTestDto,
  LabOrder, CreateLabOrderDto,
  LabResult, RecordLabResultDto
} from '../../domain/models/laboratory.models';

@Injectable()
export class LaboratoryAdapter extends LaboratoryServicePort {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/laboratory`;

  // ── Lab Tests ────────────────────────────────────────────
  getLabTests(): Observable<ApiResponse<LabTest[]>> {
    return this.http.get<ApiResponse<LabTest[]>>(`${this.api}/tests`);
  }
  getLabTest(id: number): Observable<ApiResponse<LabTest>> {
    return this.http.get<ApiResponse<LabTest>>(`${this.api}/tests/${id}`);
  }
  createLabTest(dto: CreateLabTestDto): Observable<ApiResponse<LabTest>> {
    return this.http.post<ApiResponse<LabTest>>(`${this.api}/tests`, dto);
  }
  updateLabTest(id: number, dto: UpdateLabTestDto): Observable<ApiResponse<LabTest>> {
    return this.http.put<ApiResponse<LabTest>>(`${this.api}/tests/${id}`, dto);
  }
  deleteLabTest(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/tests/${id}`);
  }

  // ── Lab Orders ───────────────────────────────────────────
  getLabOrders(): Observable<ApiResponse<LabOrder[]>> {
    return this.http.get<ApiResponse<LabOrder[]>>(`${this.api}/orders`);
  }
  getLabOrder(id: number): Observable<ApiResponse<LabOrder>> {
    return this.http.get<ApiResponse<LabOrder>>(`${this.api}/orders/${id}`);
  }
  getLabOrdersByPatient(patientId: number): Observable<ApiResponse<LabOrder[]>> {
    return this.http.get<ApiResponse<LabOrder[]>>(`${this.api}/orders/patient/${patientId}`);
  }
  createLabOrder(dto: CreateLabOrderDto): Observable<ApiResponse<LabOrder>> {
    return this.http.post<ApiResponse<LabOrder>>(`${this.api}/orders`, dto);
  }

  // ── Lab Results ──────────────────────────────────────────
  getResultsByOrder(orderId: number): Observable<ApiResponse<LabResult[]>> {
    return this.http.get<ApiResponse<LabResult[]>>(`${this.api}/results/order/${orderId}`);
  }
  recordResult(dto: RecordLabResultDto): Observable<ApiResponse<LabResult>> {
    return this.http.post<ApiResponse<LabResult>>(`${this.api}/results`, dto);
  }
}
