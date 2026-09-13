// ============================================================
// Infrastructure Layer — Pharmacy Adapter
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PharmacyServicePort } from '../../application/ports/pharmacy.port';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Medicine, CreateMedicineDto, UpdateMedicineDto,
  Stock, AddStockDto, UpdateStockDto,
  DispensingOrder, DispenseOrderRequestDto
} from '../../domain/models/pharmacy.models';

@Injectable()
export class PharmacyAdapter extends PharmacyServicePort {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/pharmacy`;

  // ── Medicines ────────────────────────────────────────────
  getMedicines(): Observable<ApiResponse<Medicine[]>> {
    return this.http.get<ApiResponse<Medicine[]>>(`${this.api}/medicines`);
  }
  getMedicine(id: number): Observable<ApiResponse<Medicine>> {
    return this.http.get<ApiResponse<Medicine>>(`${this.api}/medicines/${id}`);
  }
  createMedicine(dto: CreateMedicineDto): Observable<ApiResponse<Medicine>> {
    return this.http.post<ApiResponse<Medicine>>(`${this.api}/medicines`, dto);
  }
  updateMedicine(id: number, dto: UpdateMedicineDto): Observable<ApiResponse<Medicine>> {
    return this.http.put<ApiResponse<Medicine>>(`${this.api}/medicines/${id}`, dto);
  }
  deleteMedicine(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.api}/medicines/${id}`);
  }

  // ── Stocks ───────────────────────────────────────────────
  getStocks(): Observable<ApiResponse<Stock[]>> {
    return this.http.get<ApiResponse<Stock[]>>(`${this.api}/stocks`);
  }
  getStocksByMedicine(medicineId: number): Observable<ApiResponse<Stock[]>> {
    return this.http.get<ApiResponse<Stock[]>>(`${this.api}/stocks/medicine/${medicineId}`);
  }
  addStock(dto: AddStockDto): Observable<ApiResponse<Stock>> {
    return this.http.post<ApiResponse<Stock>>(`${this.api}/stocks`, dto);
  }
  updateStock(id: number, dto: UpdateStockDto): Observable<ApiResponse<Stock>> {
    return this.http.put<ApiResponse<Stock>>(`${this.api}/stocks/${id}`, dto);
  }

  // ── Dispensing ───────────────────────────────────────────
  getDispensingOrders(): Observable<ApiResponse<DispensingOrder[]>> {
    return this.http.get<ApiResponse<DispensingOrder[]>>(`${this.api}/dispense`);
  }
  getDispensingOrder(id: number): Observable<ApiResponse<DispensingOrder>> {
    return this.http.get<ApiResponse<DispensingOrder>>(`${this.api}/dispense/${id}`);
  }
  dispense(dto: DispenseOrderRequestDto): Observable<ApiResponse<DispensingOrder>> {
    return this.http.post<ApiResponse<DispensingOrder>>(`${this.api}/dispense`, dto);
  }
}
