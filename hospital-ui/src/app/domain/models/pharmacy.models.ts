// ============================================================
// Domain Layer — Pharmacy Models
// Pure TypeScript interfaces, zero Angular dependencies
// ============================================================

import { DosageForm, DispensingStatus } from '../enums/enums';

// ── Medicine ─────────────────────────────────────────────────
export interface Medicine {
  id: number;
  name: string;
  genericName: string;
  sku: string;
  dosageForm: DosageForm;
  dosageFormName: string;
  unitPrice: number;
  manufacturer: string;
  totalStock: number;
  createdAt: string;
}

export interface CreateMedicineDto {
  name: string;
  genericName: string;
  sku: string;
  dosageForm: DosageForm;
  unitPrice: number;
  manufacturer: string;
}

export interface UpdateMedicineDto extends CreateMedicineDto {}

// ── Stock ────────────────────────────────────────────────────
export interface Stock {
  id: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  quantityInStock: number;
  reorderLevel: number;
  expiryDate: string;
  location: string;
  isLowStock: boolean;
  isExpired: boolean;
  lastUpdated: string;
}

export interface AddStockDto {
  medicineId: number;
  batchNumber: string;
  quantity: number;
  reorderLevel: number;
  expiryDate: string;
  location: string;
}

export interface UpdateStockDto {
  quantityInStock: number;
  reorderLevel: number;
  location: string;
}

// ── Dispensing ───────────────────────────────────────────────
export interface DispensingOrderItem {
  id: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

export interface DispensingOrder {
  id: number;
  patientId: number;
  patientName: string;
  doctorId?: number;
  doctorName: string;
  prescriptionId?: number;
  dispensedDate: string;
  totalAmount: number;
  status: DispensingStatus;
  statusName: string;
  notes?: string;
  items: DispensingOrderItem[];
}

export interface DispenseItemDto {
  medicineId: number;
  quantity: number;
}

export interface DispenseOrderRequestDto {
  patientId: number;
  doctorId?: number;
  prescriptionId?: number;
  notes?: string;
  items: DispenseItemDto[];
}
