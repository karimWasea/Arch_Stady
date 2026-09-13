// ============================================================
// Presentation Layer — Dispensing Component
// Pharmacy prescription dispensing, point-of-sale medication orders
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PharmacyServicePort } from '../../../../application/ports/pharmacy.port';
import { ClinicalServicePort } from '../../../../application/ports/clinical.port';
import { DispensingOrder, DispensingOrderItem, DispenseOrderRequestDto, Medicine } from '../../../../domain/models/pharmacy.models';
import { DispensingStatus } from '../../../../domain/enums/enums';
import { Patient, Doctor } from '../../../../domain/models/clinical.models';

@Component({
  selector: 'app-dispensing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Prescription Dispensing & Orders</h1>
          <p>Fulfill outpatient & inpatient medication orders, calculate fees, and log dispensing records</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span class="btn-icon">🛒</span> New Dispensing Order
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon text-info">📋</span>
          <div class="stat-info">
            <span class="stat-label">Total Dispensing Orders</span>
            <span class="stat-value text-info">{{ orders().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-success">💰</span>
          <div class="stat-info">
            <span class="stat-label">Total Dispensed Value</span>
            <span class="stat-value text-success">{{ totalRevenue() | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-primary">✅</span>
          <div class="stat-info">
            <span class="stat-label">Dispensed Orders</span>
            <span class="stat-value text-primary">{{ completedCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-warning">⏳</span>
          <div class="stat-info">
            <span class="stat-label">Pending Orders</span>
            <span class="stat-value text-warning">{{ pendingCount() }}</span>
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
              placeholder="Search by patient, physician, or order #..."
              (input)="onSearch($event)"
              [value]="searchQuery()"
              class="search-input"
            />
            @if (searchQuery()) {
              <button (click)="clearSearch()" class="btn-clear" title="Clear search">✕</button>
            }
          </div>

          <div class="filter-controls">
            <!-- Filter Tabs by Status -->
            <div class="filter-tabs">
              <button
                type="button"
                (click)="setStatusFilter('ALL')"
                class="tab-btn"
                [class.active]="statusFilter() === 'ALL'"
              >
                All ({{ orders().length }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('DISPENSED')"
                class="tab-btn tab-success"
                [class.active]="statusFilter() === 'DISPENSED'"
              >
                Dispensed ({{ completedCount() }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('PENDING')"
                class="tab-btn tab-warning"
                [class.active]="statusFilter() === 'PENDING'"
              >
                Pending ({{ pendingCount() }})
              </button>
              <button
                type="button"
                (click)="setStatusFilter('CANCELLED')"
                class="tab-btn tab-danger"
                [class.active]="statusFilter() === 'CANCELLED'"
              >
                Cancelled ({{ cancelledCount() }})
              </button>
            </div>
          </div>
        </div>

        <!-- Orders Table -->
        @if (isLoading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p>Loading dispensing records...</p>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="state-box">
            <span class="empty-icon">🛒</span>
            <p class="empty-title">No dispensing orders found</p>
            <p class="empty-subtitle">
              @if (searchQuery() || statusFilter() !== 'ALL') {
                Try adjusting your search query or status filter
              } @else {
                Create your first pharmaceutical dispensing order using the button above
              }
            </p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Prescribing Doctor</th>
                  <th>Dispense Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Items Count</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (o of filteredOrders(); track o.id) {
                  <tr [class.expanded-active-parent]="expandedOrderId() === o.id">
                    <td class="font-mono text-muted">#DISP-{{ o.id }}</td>
                    <td>
                      <div class="patient-cell">
                        <span class="patient-name font-semibold">{{ o.patientName }}</span>
                        <span class="patient-id text-muted">ID: #{{ o.patientId }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="doctor-name text-secondary">
                        {{ o.doctorName ? 'Dr. ' + o.doctorName : 'Direct / Over-the-Counter' }}
                      </span>
                    </td>
                    <td>
                      <span class="font-mono text-secondary">{{ o.dispensedDate | date:'mediumDate' }}</span>
                    </td>
                    <td>
                      <span class="order-amount font-mono font-semibold text-primary">
                        {{ o.totalAmount | currency:'USD':'symbol':'1.2-2' }}
                      </span>
                    </td>
                    <td>
                      <span
                        class="status-badge"
                        [ngClass]="{
                          'badge-dispensed': o.status === DispensingStatus.Dispensed,
                          'badge-pending': o.status === DispensingStatus.Pending,
                          'badge-cancelled': o.status === DispensingStatus.Cancelled
                        }"
                      >
                        {{ getStatusLabel(o.status, o.statusName) }}
                      </span>
                    </td>
                    <td>
                      <span class="items-count-pill font-mono">
                        {{ o.items?.length || 0 }} {{ (o.items?.length === 1) ? 'item' : 'items' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button
                        (click)="toggleExpand(o.id)"
                        class="btn-action"
                        [class.active]="expandedOrderId() === o.id"
                        title="View order medications breakdown"
                      >
                        {{ expandedOrderId() === o.id ? 'Hide Items ▲' : 'View Items ▼' }}
                      </button>
                    </td>
                  </tr>

                  <!-- Expandable Nested Row for Order Items -->
                  @if (expandedOrderId() === o.id) {
                    <tr class="expanded-row">
                      <td colspan="8">
                        <div class="items-breakdown-card">
                          <div class="breakdown-header">
                            <div class="breakdown-title">
                              <span class="breakdown-icon">💊</span>
                              <h4>Dispensed Medication Items (Order #DISP-{{ o.id }})</h4>
                            </div>
                            @if (o.notes) {
                              <div class="order-note">
                                <span class="note-label">Notes:</span>
                                <span class="note-content">{{ o.notes }}</span>
                              </div>
                            }
                          </div>

                          @if (!o.items || o.items.length === 0) {
                            <div class="empty-nested-box">
                              <p>No medication items listed in this order.</p>
                            </div>
                          } @else {
                            <table class="nested-table">
                              <thead>
                                <tr>
                                  <th>Item ID</th>
                                  <th>Medicine Name</th>
                                  <th>Dispensed Quantity</th>
                                  <th>Unit Price</th>
                                  <th class="text-right">Line Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (it of o.items; track it.id) {
                                  <tr>
                                    <td class="font-mono text-muted">#{{ it.id }}</td>
                                    <td>
                                      <span class="font-semibold text-white">{{ it.medicineName }}</span>
                                    </td>
                                    <td>
                                      <span class="font-mono text-primary font-semibold">{{ it.quantity }} units</span>
                                    </td>
                                    <td class="font-mono text-muted">
                                      {{ it.unitPrice | currency:'USD':'symbol':'1.2-2' }}
                                    </td>
                                    <td class="font-mono text-right font-semibold text-success">
                                      {{ it.subTotal | currency:'USD':'symbol':'1.2-2' }}
                                    </td>
                                  </tr>
                                }
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colspan="4" class="text-right font-semibold">Total Order Amount:</td>
                                  <td class="text-right font-mono font-semibold text-primary total-footer-val">
                                    {{ o.totalAmount | currency:'USD':'symbol':'1.2-2' }}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- New Dispensing Order Modal -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="closeCreateModalOnBackdrop($event)">
          <div class="modal-card modal-lg">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon text-primary">🛒</span>
                <h3>New Prescription Dispensing Order</h3>
              </div>
              <button (click)="closeCreateModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="dispenseForm" (ngSubmit)="onSubmit()" class="dispense-form">
              <!-- Top Order Details Grid -->
              <div class="form-grid">
                <div class="form-group">
                  <label for="patientId">Select Patient *</label>
                  <select id="patientId" formControlName="patientId">
                    <option value="">-- Choose Registered Patient --</option>
                    @for (p of patients(); track p.id) {
                      <option [value]="p.id">{{ p.firstName }} {{ p.lastName }} (ID #{{ p.id }})</option>
                    }
                  </select>
                  @if (dispenseForm.get('patientId')?.touched && dispenseForm.get('patientId')?.invalid) {
                    <span class="field-error">Patient selection is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="doctorId">Prescribing Doctor (Optional)</label>
                  <select id="doctorId" formControlName="doctorId">
                    <option value="">-- None / Direct Walk-In Dispensing --</option>
                    @for (d of doctors(); track d.id) {
                      <option [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }} ({{ d.specialization }})</option>
                    }
                  </select>
                </div>

                <div class="form-group full-width">
                  <label for="notes">Dispensing Notes / Special Instructions</label>
                  <input
                    id="notes"
                    type="text"
                    formControlName="notes"
                    placeholder="e.g. Inpatient dosage, verified allergy profile, take with meals"
                  />
                </div>
              </div>

              <!-- Dynamic Items Section -->
              <div class="items-section">
                <div class="items-header">
                  <div class="items-header-title">
                    <span class="section-icon">💊</span>
                    <h4>Prescription Medication Items ({{ itemsArray.length }})</h4>
                  </div>
                  <button type="button" (click)="addItem()" class="btn-add-item">
                    ➕ Add Another Medicine
                  </button>
                </div>

                <div class="items-list">
                  @for (itemGroup of itemsArray.controls; track $index) {
                    <div [formGroup]="$any(itemGroup)" class="item-row-card">
                      <div class="item-number-tag">
                        #{{ $index + 1 }}
                      </div>

                      <div class="item-inputs-grid">
                        <div class="form-group medicine-select-group">
                          <label>Select Medicine *</label>
                          <select formControlName="medicineId">
                            <option value="">-- Choose Medicine --</option>
                            @for (med of medicines(); track med.id) {
                              <option [value]="med.id">
                                {{ med.name }} ({{ med.genericName }}) — {{ med.unitPrice | currency:'USD' }} [Stock: {{ med.totalStock }}]
                              </option>
                            }
                          </select>
                          @if (itemGroup.get('medicineId')?.touched && itemGroup.get('medicineId')?.invalid) {
                            <span class="field-error">Medicine is required</span>
                          }
                        </div>

                        <div class="form-group qty-group">
                          <label>Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            formControlName="quantity"
                            placeholder="Qty"
                          />
                          @if (itemGroup.get('quantity')?.touched && itemGroup.get('quantity')?.invalid) {
                            <span class="field-error">Min 1</span>
                          }
                        </div>

                        <div class="item-price-preview">
                          <span class="price-label">Unit Price</span>
                          <span class="price-val font-mono">
                            {{ getItemUnitPrice(itemGroup.get('medicineId')?.value) | currency:'USD':'symbol':'1.2-2' }}
                          </span>
                        </div>

                        <div class="item-subtotal-preview">
                          <span class="price-label">Subtotal</span>
                          <span class="subtotal-val font-mono text-success">
                            {{ getItemSubtotal(itemGroup) | currency:'USD':'symbol':'1.2-2' }}
                          </span>
                        </div>
                      </div>

                      @if (itemsArray.length > 1) {
                        <button
                          type="button"
                          (click)="removeItem($index)"
                          class="btn-remove-item"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      }
                    </div>
                  }
                </div>

                <!-- Total Calculation Footer -->
                <div class="order-total-bar">
                  <span class="order-total-label">Total Dispensing Amount:</span>
                  <span class="order-total-value font-mono">
                    {{ calculateLiveTotal() | currency:'USD':'symbol':'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="modal-footer">
                <button type="button" (click)="closeCreateModal()" class="btn-secondary">Cancel</button>
                <button
                  type="submit"
                  [disabled]="dispenseForm.invalid || isSubmitting() || itemsArray.length === 0"
                  class="btn-primary"
                >
                  {{ isSubmitting() ? 'Dispensing Order...' : 'Confirm & Dispense' }}
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

    .tab-btn.tab-success.active {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }

    .tab-btn.tab-warning.active {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .tab-btn.tab-danger.active {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
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

    .data-table tbody tr.expanded-active-parent {
      background: #26334d !important;
      border-left: 3px solid #3b82f6;
    }

    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }

    .patient-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .patient-name {
      color: #f1f5f9;
    }

    .status-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .badge-dispensed {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-pending {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge-cancelled {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .items-count-pill {
      background: #0f172a;
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
      font-size: 0.8rem;
    }

    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-primary { color: #3b82f6; }
    .text-muted { color: #64748b; }
    .text-secondary { color: #94a3b8; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-danger { color: #ef4444; }
    .text-info { color: #38bdf8; }
    .text-white { color: #ffffff; }
    .text-right { text-align: right; }

    .btn-action {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .btn-action:hover, .btn-action.active {
      background: #3b82f6;
      color: #ffffff;
    }

    /* Expandable Items Row */
    .expanded-row td {
      padding: 0 !important;
      background: #0f172a !important;
    }

    .items-breakdown-card {
      padding: 1.25rem 1.5rem;
      border-bottom: 2px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .breakdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .breakdown-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .breakdown-title h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #93c5fd;
    }

    .order-note {
      font-size: 0.8rem;
      background: #1e293b;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #334155;
      display: flex;
      gap: 0.35rem;
    }

    .note-label {
      font-weight: 600;
      color: #94a3b8;
    }

    .note-content {
      color: #f1f5f9;
    }

    .nested-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      background: #1e293b;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #334155;
    }

    .nested-table th {
      background: #182234;
      color: #94a3b8;
      padding: 0.65rem 1rem;
      font-size: 0.75rem;
      border-bottom: 1px solid #334155;
    }

    .nested-table td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #283548;
      background: #1e293b;
    }

    .nested-table tfoot td {
      padding: 0.75rem 1rem;
      background: #182234;
      border-top: 1px solid #334155;
    }

    .total-footer-val {
      font-size: 1rem;
    }

    .empty-nested-box {
      padding: 1.5rem;
      text-align: center;
      color: #94a3b8;
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

    .modal-lg {
      max-width: 780px;
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

    .dispense-form {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
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

    /* Dynamic Items Section in Modal */
    .items-section {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.75rem;
    }

    .items-header-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .items-header-title h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .btn-add-item {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      padding: 0.35rem 0.85rem;
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-add-item:hover {
      background: #3b82f6;
      color: #ffffff;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .item-row-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .item-number-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      background: #0f172a;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
    }

    .item-inputs-grid {
      display: grid;
      grid-template-columns: 2.2fr 0.9fr 1fr 1fr;
      gap: 0.75rem;
      align-items: center;
      flex: 1;
    }

    .item-price-preview,
    .item-subtotal-preview {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .price-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .price-val,
    .subtotal-val {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .btn-remove-item {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s;
    }

    .btn-remove-item:hover {
      background: #ef4444;
      color: #ffffff;
    }

    .order-total-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
    }

    .order-total-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .order-total-value {
      font-size: 1.35rem;
      font-weight: 700;
      color: #10b981;
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
export class DispensingComponent implements OnInit {
  private pharmacyService = inject(PharmacyServicePort);
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  // Expose enum to template
  DispensingStatus = DispensingStatus;

  // State Signals
  orders = signal<DispensingOrder[]>([]);
  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);
  medicines = signal<Medicine[]>([]);

  searchQuery = signal<string>('');
  statusFilter = signal<'ALL' | 'DISPENSED' | 'PENDING' | 'CANCELLED'>('ALL');
  expandedOrderId = signal<number | null>(null);

  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Form for Dispensing Order
  dispenseForm: FormGroup = this.fb.group({
    patientId: ['', [Validators.required]],
    doctorId: [''],
    notes: [''],
    items: this.fb.array([])
  });

  // Computed Properties
  filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statusFilter();

    return this.orders().filter(o => {
      // 1. Status Filter
      if (sf === 'DISPENSED' && o.status !== DispensingStatus.Dispensed) return false;
      if (sf === 'PENDING' && o.status !== DispensingStatus.Pending) return false;
      if (sf === 'CANCELLED' && o.status !== DispensingStatus.Cancelled) return false;

      // 2. Search query
      if (!q) return true;
      return (
        o.patientName.toLowerCase().includes(q) ||
        (o.doctorName && o.doctorName.toLowerCase().includes(q)) ||
        `disp-${o.id}`.includes(q) ||
        `#${o.id}`.includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q))
      );
    });
  });

  totalRevenue = computed(() =>
    this.orders()
      .filter(o => o.status === DispensingStatus.Dispensed)
      .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
  );

  completedCount = computed(() =>
    this.orders().filter(o => o.status === DispensingStatus.Dispensed).length
  );

  pendingCount = computed(() =>
    this.orders().filter(o => o.status === DispensingStatus.Pending).length
  );

  cancelledCount = computed(() =>
    this.orders().filter(o => o.status === DispensingStatus.Cancelled).length
  );

  get itemsArray(): FormArray {
    return this.dispenseForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      orders: this.pharmacyService.getDispensingOrders(),
      patients: this.clinicalService.getPatients(),
      doctors: this.clinicalService.getDoctors(),
      medicines: this.pharmacyService.getMedicines()
    }).subscribe({
      next: res => {
        this.orders.set(res.orders.data || []);
        this.patients.set(res.patients.data || []);
        this.doctors.set(res.doctors.data || []);
        this.medicines.set(res.medicines.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load dispensing records and references.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setStatusFilter(filter: 'ALL' | 'DISPENSED' | 'PENDING' | 'CANCELLED'): void {
    this.statusFilter.set(filter);
  }

  toggleExpand(orderId: number): void {
    if (this.expandedOrderId() === orderId) {
      this.expandedOrderId.set(null);
    } else {
      this.expandedOrderId.set(orderId);
    }
  }

  getStatusLabel(status: DispensingStatus, fallback: string): string {
    if (status === DispensingStatus.Dispensed) return 'Dispensed';
    if (status === DispensingStatus.Pending) return 'Pending';
    if (status === DispensingStatus.Cancelled) return 'Cancelled';
    return fallback || 'Status #' + status;
  }

  // Dynamic Items Helpers
  createItemGroup(): FormGroup {
    return this.fb.group({
      medicineId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  getItemUnitPrice(medicineId: any): number {
    if (!medicineId) return 0;
    const med = this.medicines().find(m => m.id === Number(medicineId));
    return med ? med.unitPrice : 0;
  }

  getItemSubtotal(group: any): number {
    const medId = group.get('medicineId')?.value;
    const qty = Number(group.get('quantity')?.value) || 0;
    return this.getItemUnitPrice(medId) * qty;
  }

  calculateLiveTotal(): number {
    let total = 0;
    for (const ctrl of this.itemsArray.controls) {
      total += this.getItemSubtotal(ctrl);
    }
    return total;
  }

  // Modal Open / Close
  openCreateModal(): void {
    this.dispenseForm.reset({
      patientId: '',
      doctorId: '',
      notes: ''
    });
    this.itemsArray.clear();
    this.addItem(); // Start with 1 item row
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.itemsArray.clear();
    this.dispenseForm.reset();
  }

  closeCreateModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeCreateModal();
    }
  }

  onSubmit(): void {
    if (this.dispenseForm.invalid) {
      this.dispenseForm.markAllAsTouched();
      return;
    }

    if (this.itemsArray.length === 0) {
      this.showAlert('Please add at least one medication item to dispense.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.dispenseForm.value;

    const dto: DispenseOrderRequestDto = {
      patientId: Number(formVal.patientId),
      doctorId: formVal.doctorId ? Number(formVal.doctorId) : undefined,
      notes: formVal.notes ? formVal.notes.trim() : undefined,
      items: formVal.items.map((it: any) => ({
        medicineId: Number(it.medicineId),
        quantity: Number(it.quantity)
      }))
    };

    this.pharmacyService.dispense(dto).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        const orderId = res.data?.id;
        const msg = orderId ? `Dispensing Order #DISP-${orderId} recorded successfully.` : 'Dispensing order recorded successfully.';
        this.showAlert(msg, 'success');
        this.loadData();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Failed to complete dispensing order.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4500);
  }
}
