// ============================================================
// Presentation Layer — Stocks Component
// Batch inventory tracking, storage locations, expiry, and reorder levels
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PharmacyServicePort } from '../../../../application/ports/pharmacy.port';
import { Stock, AddStockDto, UpdateStockDto, Medicine } from '../../../../domain/models/pharmacy.models';

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Stock & Inventory Batches</h1>
          <p>Real-time batch-level tracking, expiration safeguards, and warehouse replenishment</p>
        </div>
        <button (click)="openAddModal()" class="btn-primary">
          <span class="btn-icon">📦</span> Add Stock Batch
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon text-info">📋</span>
          <div class="stat-info">
            <span class="stat-label">Total Batches</span>
            <span class="stat-value text-info">{{ stocks().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-primary">📦</span>
          <div class="stat-info">
            <span class="stat-label">Units in Storage</span>
            <span class="stat-value text-primary">{{ totalUnits() }}</span>
          </div>
        </div>
        <div class="stat-card" [class.highlight-card]="lowStockBatches().length > 0">
          <span class="stat-icon text-warning">⚠️</span>
          <div class="stat-info">
            <span class="stat-label">Low Stock Alerts</span>
            <span class="stat-value text-warning">{{ lowStockBatches().length }}</span>
          </div>
        </div>
        <div class="stat-card" [class.highlight-danger]="expiredBatches().length > 0">
          <span class="stat-icon text-danger">⛔</span>
          <div class="stat-info">
            <span class="stat-label">Expired Batches</span>
            <span class="stat-value text-danger">{{ expiredBatches().length }}</span>
          </div>
        </div>
      </div>

      <!-- Alert Notification -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✅' : '❌' }}</span>
          <span>{{ alertMessage() }}</span>
        </div>
      }

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Table Toolbar -->
        <div class="table-actions">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by medicine name, batch number, or location..."
              (input)="onSearch($event)"
              [value]="searchQuery()"
              class="search-input"
            />
            @if (searchQuery()) {
              <button (click)="clearSearch()" class="btn-clear" title="Clear search">✕</button>
            }
          </div>

          <div class="filter-controls">
            <!-- Filter by Status -->
            <div class="filter-tabs">
              <button
                type="button"
                (click)="setStatusFilter('ALL')"
                class="tab-btn"
                [class.active]="statusFilter() === 'ALL'"
              >
                All ({{ stocks().length }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('LOW')"
                class="tab-btn tab-warning"
                [class.active]="statusFilter() === 'LOW'"
              >
                Low Stock ({{ lowStockBatches().length }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('EXPIRED')"
                class="tab-btn tab-danger"
                [class.active]="statusFilter() === 'EXPIRED'"
              >
                Expired ({{ expiredBatches().length }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('NORMAL')"
                class="tab-btn tab-success"
                [class.active]="statusFilter() === 'NORMAL'"
              >
                Healthy
              </button>
            </div>

            <!-- Medicine Dropdown Filter -->
            <select (change)="onMedicineFilter($event)" class="medicine-select" [value]="selectedMedicineFilter()">
              <option value="">All Medicines</option>
              @for (m of medicines(); track m.id) {
                <option [value]="m.id">{{ m.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Table State / Data -->
        @if (isLoading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p>Loading stock inventory...</p>
          </div>
        } @else if (filteredStocks().length === 0) {
          <div class="state-box">
            <span class="empty-icon">📦</span>
            <p class="empty-title">No stock batches found</p>
            <p class="empty-subtitle">
              @if (searchQuery() || statusFilter() !== 'ALL' || selectedMedicineFilter()) {
                Try clearing or adjusting your search filters
              } @else {
                Record your first inventory stock batch using the button above
              }
            </p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch #</th>
                  <th>Quantity in Stock</th>
                  <th>Reorder Level</th>
                  <th>Expiry Date</th>
                  <th>Storage Location</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (s of filteredStocks(); track s.id) {
                  <tr [class.row-alert-expired]="isExpired(s)" [class.row-alert-low]="!isExpired(s) && isLowStock(s)">
                    <td>
                      <div class="medicine-cell">
                        <span class="medicine-name">{{ s.medicineName }}</span>
                        <span class="medicine-id text-muted">ID: #{{ s.medicineId }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="batch-badge font-mono">{{ s.batchNumber }}</span>
                    </td>
                    <td>
                      <span class="qty-text font-semibold" [class.text-danger]="s.quantityInStock === 0" [class.text-warning]="s.quantityInStock <= s.reorderLevel">
                        {{ s.quantityInStock }} units
                      </span>
                    </td>
                    <td>
                      <span class="text-muted font-mono">{{ s.reorderLevel }} units</span>
                    </td>
                    <td>
                      <div class="expiry-cell">
                        <span class="font-mono">{{ s.expiryDate | date:'mediumDate' }}</span>
                        @if (isExpired(s)) {
                          <span class="expiry-warning text-danger">Expired</span>
                        } @else if (isNearExpiry(s)) {
                          <span class="expiry-warning text-warning">Near Expiry</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="location-badge">
                        <span>📍</span>
                        <span>{{ s.location || 'Unassigned' }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="status-tags">
                        @if (isExpired(s)) {
                          <span class="status-badge badge-expired">⛔ Expired</span>
                        }
                        @if (isLowStock(s)) {
                          <span class="status-badge badge-low">⚠️ Low Stock</span>
                        }
                        @if (!isExpired(s) && !isLowStock(s)) {
                          <span class="status-badge badge-normal">✅ In Stock</span>
                        }
                      </div>
                    </td>
                    <td class="text-right">
                      <button (click)="openUpdateModal(s)" class="btn-action edit" title="Update Batch Quantity or Location">
                        ✏️ Update
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Add Stock Modal -->
      @if (showAddModal()) {
        <div class="modal-backdrop" (click)="closeAddModalOnBackdrop($event)">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon text-primary">📦</span>
                <h3>Add New Stock Batch</h3>
              </div>
              <button (click)="closeAddModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="addStockForm" (ngSubmit)="onAddSubmit()" class="modal-form">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label for="medicineId">Target Medicine *</label>
                  <select id="medicineId" formControlName="medicineId">
                    <option value="">-- Select a Medicine from Formulary --</option>
                    @for (m of medicines(); track m.id) {
                      <option [value]="m.id">{{ m.name }} (SKU: {{ m.sku }})</option>
                    }
                  </select>
                  @if (addStockForm.get('medicineId')?.touched && addStockForm.get('medicineId')?.invalid) {
                    <span class="field-error">Medicine selection is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="batchNumber">Batch Number / Lot *</label>
                  <input
                    id="batchNumber"
                    type="text"
                    formControlName="batchNumber"
                    placeholder="e.g. BCH-2026-098"
                  />
                  @if (addStockForm.get('batchNumber')?.touched && addStockForm.get('batchNumber')?.invalid) {
                    <span class="field-error">Batch number is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="quantity">Initial Quantity *</label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    formControlName="quantity"
                    placeholder="e.g. 100"
                  />
                  @if (addStockForm.get('quantity')?.touched && addStockForm.get('quantity')?.invalid) {
                    <span class="field-error">Quantity must be at least 1</span>
                  }
                </div>

                <div class="form-group">
                  <label for="reorderLevel">Reorder Minimum Threshold *</label>
                  <input
                    id="reorderLevel"
                    type="number"
                    min="0"
                    formControlName="reorderLevel"
                    placeholder="e.g. 20"
                  />
                  @if (addStockForm.get('reorderLevel')?.touched && addStockForm.get('reorderLevel')?.invalid) {
                    <span class="field-error">Reorder level must be 0 or more</span>
                  }
                </div>

                <div class="form-group">
                  <label for="expiryDate">Expiration Date *</label>
                  <input
                    id="expiryDate"
                    type="date"
                    formControlName="expiryDate"
                  />
                  @if (addStockForm.get('expiryDate')?.touched && addStockForm.get('expiryDate')?.invalid) {
                    <span class="field-error">Valid expiry date is required</span>
                  }
                </div>

                <div class="form-group full-width">
                  <label for="location">Warehouse / Storage Location *</label>
                  <input
                    id="location"
                    type="text"
                    formControlName="location"
                    placeholder="e.g. Central Pharmacy Shelf A-14, Bin 03"
                  />
                  @if (addStockForm.get('location')?.touched && addStockForm.get('location')?.invalid) {
                    <span class="field-error">Storage location is required</span>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeAddModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="addStockForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Adding Batch...' : 'Register Stock Batch' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Update Stock Modal -->
      @if (showUpdateModal() && selectedStock()) {
        <div class="modal-backdrop" (click)="closeUpdateModalOnBackdrop($event)">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon text-warning">✏️</span>
                <h3>Update Stock Batch</h3>
              </div>
              <button (click)="closeUpdateModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="updateStockForm" (ngSubmit)="onUpdateSubmit()" class="modal-form">
              <!-- Summary of the Stock Batch being updated -->
              <div class="selected-stock-summary">
                <div class="summary-col">
                  <span class="summary-label">Medicine</span>
                  <span class="summary-val text-primary">{{ selectedStock()?.medicineName }}</span>
                </div>
                <div class="summary-col">
                  <span class="summary-label">Batch Code</span>
                  <span class="summary-val font-mono">{{ selectedStock()?.batchNumber }}</span>
                </div>
                <div class="summary-col">
                  <span class="summary-label">Expiry Date</span>
                  <span class="summary-val font-mono">{{ selectedStock()?.expiryDate | date:'mediumDate' }}</span>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label for="uQuantity">Quantity In Stock *</label>
                  <input
                    id="uQuantity"
                    type="number"
                    min="0"
                    formControlName="quantityInStock"
                  />
                  @if (updateStockForm.get('quantityInStock')?.touched && updateStockForm.get('quantityInStock')?.invalid) {
                    <span class="field-error">Quantity must be 0 or more</span>
                  }
                </div>

                <div class="form-group">
                  <label for="uReorder">Reorder Threshold *</label>
                  <input
                    id="uReorder"
                    type="number"
                    min="0"
                    formControlName="reorderLevel"
                  />
                  @if (updateStockForm.get('reorderLevel')?.touched && updateStockForm.get('reorderLevel')?.invalid) {
                    <span class="field-error">Reorder level must be 0 or more</span>
                  }
                </div>

                <div class="form-group full-width">
                  <label for="uLocation">Storage Location *</label>
                  <input
                    id="uLocation"
                    type="text"
                    formControlName="location"
                    placeholder="e.g. Shelf B-02"
                  />
                  @if (updateStockForm.get('location')?.touched && updateStockForm.get('location')?.invalid) {
                    <span class="field-error">Storage location is required</span>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeUpdateModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="updateStockForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Updating...' : 'Save Stock Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.25rem;
    }

    .page-header p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      transition: border-color 0.2s;
    }

    .stat-card.highlight-card {
      border-color: rgba(245, 158, 11, 0.4);
    }

    .stat-card.highlight-danger {
      border-color: rgba(239, 68, 68, 0.4);
    }

    .stat-icon {
      font-size: 1.75rem;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    /* Buttons */
    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 0.65rem 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: #475569;
      color: #ffffff;
    }

    /* Alerts */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .alert.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .alert.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Content Card */
    .content-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .table-actions {
      padding: 1.25rem 1.5rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 280px;
      max-width: 420px;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.85rem;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 2.2rem 0.65rem 2.4rem;
      color: #f1f5f9;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .btn-clear {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-clear:hover {
      color: #f1f5f9;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-tabs {
      display: flex;
      background: #0f172a;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #334155;
      gap: 3px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn:hover {
      color: #f1f5f9;
    }

    .tab-btn.active {
      background: #334155;
      color: #f1f5f9;
    }

    .tab-btn.tab-warning.active {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .tab-btn.tab-danger.active {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .tab-btn.tab-success.active {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }

    .medicine-select {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      color: #f1f5f9;
      font-size: 0.85rem;
      outline: none;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .data-table th {
      background: #0f172a;
      color: #94a3b8;
      font-weight: 600;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid #334155;
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .data-table tbody tr {
      background: #1e293b;
      transition: background 0.15s ease;
    }

    .data-table tbody tr:nth-child(even) {
      background: #182234;
    }

    .data-table tbody tr:hover {
      background: #334155;
    }

    .data-table tbody tr.row-alert-expired {
      background: rgba(239, 68, 68, 0.07);
    }

    .data-table tbody tr.row-alert-low {
      background: rgba(245, 158, 11, 0.06);
    }

    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }

    .medicine-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .medicine-name {
      font-weight: 600;
      color: #f1f5f9;
    }

    .batch-badge {
      background: #0f172a;
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
      font-size: 0.8rem;
    }

    .expiry-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .expiry-warning {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .location-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.825rem;
      color: #cbd5e1;
    }

    .status-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .status-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 9999px;
    }

    .badge-normal {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-low {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge-expired {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-primary { color: #3b82f6; }
    .text-muted { color: #64748b; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-danger { color: #ef4444; }
    .text-info { color: #38bdf8; }
    .text-right { text-align: right; }

    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .btn-action.edit {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .btn-action.edit:hover {
      background: #3b82f6;
      color: #ffffff;
    }

    /* State Box */
    .state-box {
      padding: 4rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: #94a3b8;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.15s;
    }

    .btn-close:hover {
      color: #f1f5f9;
    }

    .modal-form {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .selected-stock-summary {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.75rem;
    }

    .summary-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .summary-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }

    .summary-val {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .form-group input,
    .form-group select {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: #f1f5f9;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .field-error {
      color: #f87171;
      font-size: 0.75rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
    }
  `]
})
export class StocksComponent implements OnInit {
  private pharmacyService = inject(PharmacyServicePort);
  private fb = inject(FormBuilder);

  // State Signals
  stocks = signal<Stock[]>([]);
  medicines = signal<Medicine[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<'ALL' | 'LOW' | 'EXPIRED' | 'NORMAL'>('ALL');
  selectedMedicineFilter = signal<string>('');

  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showAddModal = signal<boolean>(false);
  showUpdateModal = signal<boolean>(false);
  selectedStock = signal<Stock | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Computed Properties
  totalUnits = computed(() =>
    this.stocks().reduce((acc, curr) => acc + curr.quantityInStock, 0)
  );

  lowStockBatches = computed(() =>
    this.stocks().filter(s => this.isLowStock(s))
  );

  expiredBatches = computed(() =>
    this.stocks().filter(s => this.isExpired(s))
  );

  filteredStocks = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    const medId = this.selectedMedicineFilter();

    return this.stocks().filter(s => {
      // 1. Medicine filter
      if (medId && s.medicineId !== Number(medId)) {
        return false;
      }

      // 2. Status filter
      if (filter === 'LOW' && !this.isLowStock(s)) return false;
      if (filter === 'EXPIRED' && !this.isExpired(s)) return false;
      if (filter === 'NORMAL' && (this.isLowStock(s) || this.isExpired(s))) return false;

      // 3. Search query
      if (!q) return true;
      return (
        s.medicineName.toLowerCase().includes(q) ||
        s.batchNumber.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q))
      );
    });
  });

  // Forms
  addStockForm = this.fb.group({
    medicineId: ['', [Validators.required]],
    batchNumber: ['', [Validators.required, Validators.maxLength(50)]],
    quantity: [50, [Validators.required, Validators.min(1)]],
    reorderLevel: [15, [Validators.required, Validators.min(0)]],
    expiryDate: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(100)]]
  });

  updateStockForm = this.fb.group({
    quantityInStock: [0, [Validators.required, Validators.min(0)]],
    reorderLevel: [0, [Validators.required, Validators.min(0)]],
    location: ['', [Validators.required, Validators.maxLength(100)]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      stocks: this.pharmacyService.getStocks(),
      medicines: this.pharmacyService.getMedicines()
    }).subscribe({
      next: res => {
        this.stocks.set(res.stocks.data || []);
        this.medicines.set(res.medicines.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load stock inventory data.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  isExpired(stock: Stock): boolean {
    if (stock.isExpired) return true;
    if (!stock.expiryDate) return false;
    return new Date(stock.expiryDate).getTime() < new Date().getTime();
  }

  isNearExpiry(stock: Stock): boolean {
    if (this.isExpired(stock)) return false;
    if (!stock.expiryDate) return false;
    const diffDays = (new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 60; // 60 days near expiry threshold
  }

  isLowStock(stock: Stock): boolean {
    return stock.isLowStock || stock.quantityInStock <= stock.reorderLevel;
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setStatusFilter(filter: 'ALL' | 'LOW' | 'EXPIRED' | 'NORMAL'): void {
    this.statusFilter.set(filter);
  }

  onMedicineFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedMedicineFilter.set(val);
  }

  // Add Stock Modal
  openAddModal(): void {
    this.addStockForm.reset({
      medicineId: '',
      batchNumber: '',
      quantity: 50,
      reorderLevel: 15,
      expiryDate: '',
      location: ''
    });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.addStockForm.reset();
  }

  closeAddModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeAddModal();
    }
  }

  onAddSubmit(): void {
    if (this.addStockForm.invalid) {
      this.addStockForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.addStockForm.value;

    const dto: AddStockDto = {
      medicineId: Number(val.medicineId),
      batchNumber: val.batchNumber!.trim(),
      quantity: Number(val.quantity),
      reorderLevel: Number(val.reorderLevel),
      expiryDate: new Date(val.expiryDate!).toISOString(),
      location: val.location!.trim()
    };

    this.pharmacyService.addStock(dto).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        const batch = res.data?.batchNumber || dto.batchNumber;
        this.showAlert(`Stock batch "${batch}" added successfully.`, 'success');
        this.loadData();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Failed to add stock batch.', 'error');
      }
    });
  }

  // Update Stock Modal
  openUpdateModal(stock: Stock): void {
    this.selectedStock.set(stock);
    this.updateStockForm.patchValue({
      quantityInStock: stock.quantityInStock,
      reorderLevel: stock.reorderLevel,
      location: stock.location || ''
    });
    this.showUpdateModal.set(true);
  }

  closeUpdateModal(): void {
    this.showUpdateModal.set(false);
    this.selectedStock.set(null);
    this.updateStockForm.reset();
  }

  closeUpdateModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeUpdateModal();
    }
  }

  onUpdateSubmit(): void {
    if (this.updateStockForm.invalid) {
      this.updateStockForm.markAllAsTouched();
      return;
    }

    const stock = this.selectedStock();
    if (!stock) return;

    this.isSubmitting.set(true);
    const val = this.updateStockForm.value;

    const dto: UpdateStockDto = {
      quantityInStock: Number(val.quantityInStock),
      reorderLevel: Number(val.reorderLevel),
      location: val.location!.trim()
    };

    this.pharmacyService.updateStock(stock.id, dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeUpdateModal();
        this.showAlert(`Stock batch "${stock.batchNumber}" updated successfully.`, 'success');
        this.loadData();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Failed to update stock batch.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4500);
  }
}
