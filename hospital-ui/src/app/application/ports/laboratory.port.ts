// ============================================================
// Application Layer — Laboratory Service Port
// ============================================================

import { Observable } from 'rxjs';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  LabTest, CreateLabTestDto, UpdateLabTestDto,
  LabOrder, CreateLabOrderDto,
  LabResult, RecordLabResultDto
} from '../../domain/models/laboratory.models';

export abstract class LaboratoryServicePort {
  // ── Lab Tests ────────────────────────────────────────────
  abstract getLabTests(): Observable<ApiResponse<LabTest[]>>;
  abstract getLabTest(id: number): Observable<ApiResponse<LabTest>>;
  abstract createLabTest(dto: CreateLabTestDto): Observable<ApiResponse<LabTest>>;
  abstract updateLabTest(id: number, dto: UpdateLabTestDto): Observable<ApiResponse<LabTest>>;
  abstract deleteLabTest(id: number): Observable<ApiResponse<void>>;

  // ── Lab Orders ───────────────────────────────────────────
  abstract getLabOrders(): Observable<ApiResponse<LabOrder[]>>;
  abstract getLabOrder(id: number): Observable<ApiResponse<LabOrder>>;
  abstract getLabOrdersByPatient(patientId: number): Observable<ApiResponse<LabOrder[]>>;
  abstract createLabOrder(dto: CreateLabOrderDto): Observable<ApiResponse<LabOrder>>;

  // ── Lab Results ──────────────────────────────────────────
  abstract getResultsByOrder(orderId: number): Observable<ApiResponse<LabResult[]>>;
  abstract recordResult(dto: RecordLabResultDto): Observable<ApiResponse<LabResult>>;
}
