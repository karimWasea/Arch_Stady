// ============================================================
// Domain Layer — Laboratory Models
// Pure TypeScript interfaces, zero Angular dependencies
// ============================================================

import { LabPriority, LabOrderStatus } from '../enums/enums';

// ── Lab Test ─────────────────────────────────────────────────
export interface LabTest {
  id: number;
  code: string;
  name: string;
  category: string;
  normalRange: string;
  unitOfMeasure: string;
  price: number;
  description?: string;
}

export interface CreateLabTestDto {
  code: string;
  name: string;
  category: string;
  normalRange: string;
  unitOfMeasure: string;
  price: number;
  description?: string;
}

export interface UpdateLabTestDto extends CreateLabTestDto {}

// ── Lab Order ────────────────────────────────────────────────
export interface LabOrderItem {
  id: number;
  labTestId: number;
  testCode: string;
  testName: string;
  price: number;
}

export interface LabOrder {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  orderDate: string;
  priority: LabPriority;
  priorityName: string;
  status: LabOrderStatus;
  statusName: string;
  clinicalNotes?: string;
  items: LabOrderItem[];
  results: LabResult[];
}

export interface CreateLabOrderDto {
  patientId: number;
  doctorId: number;
  priority: LabPriority;
  clinicalNotes?: string;
  testIds: number[];
}

// ── Lab Result ───────────────────────────────────────────────
export interface LabResult {
  id: number;
  labOrderId: number;
  labTestId: number;
  testName: string;
  resultValue: string;
  unitOfMeasure: string;
  normalRange: string;
  isAbnormal: boolean;
  performedDate: string;
  performedBy: string;
  remarks?: string;
}

export interface RecordLabResultDto {
  labOrderId: number;
  labTestId: number;
  resultValue: string;
  isAbnormal: boolean;
  performedBy: string;
  remarks?: string;
}
