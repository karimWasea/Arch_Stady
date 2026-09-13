// ============================================================
// Application Layer — Pharmacy Service Port
// ============================================================

import { Observable } from 'rxjs';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Medicine, CreateMedicineDto, UpdateMedicineDto,
  Stock, AddStockDto, UpdateStockDto,
  DispensingOrder, DispenseOrderRequestDto
} from '../../domain/models/pharmacy.models';

export abstract class PharmacyServicePort {
  // ── Medicines ────────────────────────────────────────────
  abstract getMedicines(): Observable<ApiResponse<Medicine[]>>;
  abstract getMedicine(id: number): Observable<ApiResponse<Medicine>>;
  abstract createMedicine(dto: CreateMedicineDto): Observable<ApiResponse<Medicine>>;
  abstract updateMedicine(id: number, dto: UpdateMedicineDto): Observable<ApiResponse<Medicine>>;
  abstract deleteMedicine(id: number): Observable<ApiResponse<void>>;

  // ── Stocks ───────────────────────────────────────────────
  abstract getStocks(): Observable<ApiResponse<Stock[]>>;
  abstract getStocksByMedicine(medicineId: number): Observable<ApiResponse<Stock[]>>;
  abstract addStock(dto: AddStockDto): Observable<ApiResponse<Stock>>;
  abstract updateStock(id: number, dto: UpdateStockDto): Observable<ApiResponse<Stock>>;

  // ── Dispensing ───────────────────────────────────────────
  abstract getDispensingOrders(): Observable<ApiResponse<DispensingOrder[]>>;
  abstract getDispensingOrder(id: number): Observable<ApiResponse<DispensingOrder>>;
  abstract dispense(dto: DispenseOrderRequestDto): Observable<ApiResponse<DispensingOrder>>;
}
