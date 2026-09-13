// ============================================================
// Presentation Layer — Lab Orders Component
// Manages diagnostic requisitions, test selections, and priority processing
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LaboratoryServicePort } from '../../../../application/ports/laboratory.port';
import { ClinicalServicePort } from '../../../../application/ports/clinical.port';
import { LabOrder, CreateLabOrderDto, LabTest } from '../../../../domain/models/laboratory.models';
import { Patient, Doctor } from '../../../../domain/models/clinical.models';
import { LabPriority, LabOrderStatus, LabPriorityNames } from '../../../../domain/enums/enums';

@Component({
  selector: 'app-lab-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <h1>🧪 Laboratory Requisitions & Orders</h1>
          <p>Create, track, and process patient diagnostic laboratory requests and priority workflows</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span>+</span> Create Lab Order
        </button>
      </div>

      <!-- Alert Notification -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✓' : '⚠️' }}</span>
          <span>{{ alertMessage() }}</span>
        </div>
      }

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Table Filters and Search -->
        <div class="table-actions">
          <div class="filter-group">
            <div class="search-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search order #, patient, doctor..."
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="search-input"
              />
            </div>

            <select
              [value]="priorityFilter()"
              (change)="onPriorityFilterChange($event)"
              class="filter-select"
            >
              <option value="ALL">All Priorities</option>
              <option [value]="LabPriority.Routine">Routine</option>
              <option [value]="LabPriority.Urgent">Urgent</option>
              <option [value]="LabPriority.Stat">Stat</option>
            </select>

            <select
              [value]="statusFilter()"
              (change)="onStatusFilterChange($event)"
              class="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option [value]="LabOrderStatus.Ordered">Ordered</option>
              <option [value]="LabOrderStatus.InProgress">InProgress</option>
              <option [value]="LabOrderStatus.Completed">Completed</option>
              <option [value]="LabOrderStatus.Cancelled">Cancelled</option>
            </select>
          </div>

          <span class="count-badge">{{ filteredOrders().length }} Orders</span>
        </div>

        <!-- Table / Loading / Empty States -->
        @if (isLoading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p>Loading laboratory orders...</p>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="state-box">
            <span class="empty-icon">📋</span>
            <p>No laboratory orders found.</p>
            @if (searchQuery() || priorityFilter() !== 'ALL' || statusFilter() !== 'ALL') {
              <button (click)="clearFilters()" class="btn-secondary btn-sm">Reset Filters</button>
            }
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="expand-col"></th>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Order Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Tests</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders(); track order.id) {
                  <!-- Order Summary Row -->
                  <tr class="order-row" [class.is-expanded]="expandedOrderId() === order.id">
                    <td class="expand-col">
                      <button
                        type="button"
                        (click)="toggleExpand(order.id)"
                        class="btn-expand"
                        [title]="expandedOrderId() === order.id ? 'Collapse details' : 'Expand details'"
                      >
                        {{ expandedOrderId() === order.id ? '▼' : '▶' }}
                      </button>
                    </td>
                    <td>
                      <span class="order-num">#{{ order.id }}</span>
                    </td>
                    <td class="font-semibold text-primary">{{ order.patientName }}</td>
                    <td class="text-secondary">Dr. {{ order.doctorName }}</td>
                    <td class="text-secondary font-mono">{{ order.orderDate | date:'mediumDate' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getPriorityClass(order.priority)">
                        {{ getPriorityLabel(order.priority, order.priorityName) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getStatusClass(order.status)">
                        <span class="status-dot"></span>
                        {{ getStatusLabel(order.status, order.statusName) }}
                      </span>
                    </td>
                    <td>
                      <span class="tests-count-pill">
                        🧪 {{ order.items?.length || 0 }} {{ (order.items?.length === 1) ? 'test' : 'tests' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button
                        (click)="toggleExpand(order.id)"
                        class="btn-action view-btn"
                      >
                        {{ expandedOrderId() === order.id ? 'Hide Tests' : 'View Tests' }}
                      </button>
                    </td>
                  </tr>

                  <!-- Expandable Details Row -->
                  @if (expandedOrderId() === order.id) {
                    <tr class="expanded-row">
                      <td colspan="9" class="expanded-cell">
                        <div class="details-panel">
                          <div class="details-meta-row">
                            <div class="meta-item">
                              <span class="meta-label">Clinical Notes:</span>
                              <span class="meta-val">{{ order.clinicalNotes || 'None specified' }}</span>
                            </div>
                            <div class="meta-item">
                              <span class="meta-label">Requisition Date:</span>
                              <span class="meta-val font-mono">{{ order.orderDate | date:'medium' }}</span>
                            </div>
                            <div class="meta-item">
                              <span class="meta-label">Recorded Results:</span>
                              <span class="meta-val">
                                {{ order.results?.length || 0 }} of {{ order.items?.length || 0 }} tests completed
                              </span>
                            </div>
                          </div>

                          <div class="items-table-wrapper">
                            <div class="sub-table-header">
                              <h4>Ordered Diagnostic Tests</h4>
                              <span class="items-total">
                                Total: {{ calculateOrderTotal(order) | currency:'USD':'symbol':'1.2-2' }}
                              </span>
                            </div>
                            <table class="sub-table">
                              <thead>
                                <tr>
                                  <th>Code</th>
                                  <th>Test Description</th>
                                  <th class="text-right">Tariff Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (item of order.items; track item.id) {
                                  <tr>
                                    <td>
                                      <span class="sub-code-badge">{{ item.testCode }}</span>
                                    </td>
                                    <td class="font-medium text-primary">{{ item.testName }}</td>
                                    <td class="text-right text-price font-mono font-semibold">
                                      {{ item.price | currency:'USD':'symbol':'1.2-2' }}
                                    </td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
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

      <!-- Create Lab Order Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">🧪</span>
                <h3>Create New Diagnostic Requisition</h3>
              </div>
              <button (click)="closeModal()" class="btn-close" type="button">&times;</button>
            </div>

            <form [formGroup]="orderForm" (ngSubmit)="onSubmitOrder()" class="modal-form">
              <!-- Patient & Doctor Row -->
              <div class="form-row">
                <div class="form-group">
                  <label>Patient *</label>
                  <select
                    formControlName="patientId"
                    [class.invalid]="isFieldInvalid('patientId')"
                  >
                    <option value="">Select Patient</option>
                    @for (patient of patients(); track patient.id) {
                      <option [value]="patient.id">
                        {{ patient.firstName }} {{ patient.lastName }} (#{{ patient.id }})
                      </option>
                    }
                  </select>
                  @if (isFieldInvalid('patientId')) {
                    <span class="field-error">Please select a patient</span>
                  }
                </div>

                <div class="form-group">
                  <label>Ordering Physician *</label>
                  <select
                    formControlName="doctorId"
                    [class.invalid]="isFieldInvalid('doctorId')"
                  >
                    <option value="">Select Doctor</option>
                    @for (doctor of doctors(); track doctor.id) {
                      <option [value]="doctor.id">
                        Dr. {{ doctor.firstName }} {{ doctor.lastName }} ({{ doctor.specialization }})
                      </option>
                    }
                  </select>
                  @if (isFieldInvalid('doctorId')) {
                    <span class="field-error">Please select an ordering doctor</span>
                  }
                </div>
              </div>

              <!-- Priority Row -->
              <div class="form-row">
                <div class="form-group">
                  <label>Order Priority *</label>
                  <select formControlName="priority">
                    <option [value]="LabPriority.Routine">Routine (Standard turnaround)</option>
                    <option [value]="LabPriority.Urgent">Urgent (Priority processing)</option>
                    <option [value]="LabPriority.Stat">Stat (Immediate critical emergency)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Clinical Notes / Indications</label>
                  <input
                    type="text"
                    formControlName="clinicalNotes"
                    placeholder="e.g. Rule out anemia, pre-op screening"
                  />
                </div>
              </div>

              <!-- Available Lab Tests Selection Section -->
              <div class="tests-selection-section">
                <div class="tests-section-header">
                  <div>
                    <label class="section-label">Select Laboratory Tests *</label>
                    <span class="section-subtext">Choose one or multiple tests for this order</span>
                  </div>
                  <div class="test-selection-stats">
                    <span class="selected-pill">
                      {{ selectedTestIds().length }} selected
                    </span>
                    <span class="price-pill">
                      Total: {{ selectedTotalEstimatedPrice() | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                  </div>
                </div>

                <!-- Test Search Bar in Modal -->
                <div class="modal-test-search">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search tests by code, name, category..."
                    [value]="modalTestSearch()"
                    (input)="onModalTestSearch($event)"
                    class="search-input test-search-input"
                  />
                </div>

                <!-- Test Checkboxes Grid -->
                <div class="tests-list-box">
                  @if (modalFilteredTests().length === 0) {
                    <div class="empty-tests">No tests found matching search criteria.</div>
                  } @else {
                    @for (test of modalFilteredTests(); track test.id) {
                      <label
                        class="test-check-item"
                        [class.checked]="isTestSelected(test.id)"
                      >
                        <input
                          type="checkbox"
                          [checked]="isTestSelected(test.id)"
                          (change)="toggleTestSelection(test.id)"
                        />
                        <div class="test-info">
                          <div class="test-title-line">
                            <span class="test-check-code">{{ test.code }}</span>
                            <span class="test-check-name">{{ test.name }}</span>
                          </div>
                          <div class="test-sub-line">
                            <span class="test-cat">{{ test.category }}</span>
                            <span class="test-range font-mono">Ref: {{ test.normalRange }} {{ test.unitOfMeasure }}</span>
                          </div>
                        </div>
                        <span class="test-check-price font-mono">
                          {{ test.price | currency:'USD':'symbol':'1.2-2' }}
                        </span>
                      </label>
                    }
                  }
                </div>

                @if (selectedTestIds().length === 0 && orderSubmittedAttempt()) {
                  <span class="field-error">At least one laboratory test must be selected.</span>
                }
              </div>

              <!-- Modal Actions -->
              <div class="modal-actions">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="btn-secondary"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="orderForm.invalid || selectedTestIds().length === 0 || isSubmitting()"
                  class="btn-primary"
                >
                  @if (isSubmitting()) {
                    <span class="mini-spinner"></span>
                    <span>Creating Order...</span>
                  } @else {
                    <span>Issue Order ({{ selectedTestIds().length }} Tests)</span>
                  }
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
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-titles h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .header-titles p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }

    /* Buttons */
    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #475569;
    }

    .btn-sm {
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem;
    }

    .btn-expand {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-expand:hover {
      background: #334155;
      color: #38bdf8;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .btn-close:hover {
      color: #f1f5f9;
      background: #334155;
    }

    /* Alerts */
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .alert.success {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .alert.error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .alert-icon {
      font-weight: bold;
    }

    /* Content Card */
    .content-card {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    .table-actions {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #1e293b;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.85rem;
      pointer-events: none;
      opacity: 0.6;
    }
    .search-input {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 0.6rem 1rem 0.6rem 2.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      width: 280px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #3b82f6;
    }
    .search-input::placeholder {
      color: #64748b;
    }

    .filter-select {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .filter-select:focus {
      border-color: #3b82f6;
    }

    .count-badge {
      font-size: 0.8rem;
      background: #0f172a;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-weight: 600;
    }

    /* States */
    .state-box {
      padding: 4rem 2rem;
      text-align: center;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .empty-icon {
      font-size: 2.5rem;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .mini-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
      padding: 0.85rem 1.25rem;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      white-space: nowrap;
    }
    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }
    .expand-col {
      width: 40px;
      padding-right: 0 !important;
      text-align: center;
    }

    .order-row {
      background: #1e293b;
      transition: background 0.15s;
    }
    .order-row:nth-child(4n+1) {
      background: rgba(15, 23, 42, 0.45);
    }
    .order-row:hover {
      background: #334155;
    }
    .order-row.is-expanded {
      background: rgba(59, 130, 246, 0.08);
      border-bottom-color: transparent;
    }

    .order-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #38bdf8;
    }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-primary { color: #f1f5f9; }
    .text-secondary { color: #94a3b8; }
    .text-price { color: #34d399; }
    .text-right { text-align: right; }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .badge-routine {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-urgent {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-stat {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      font-weight: 700;
      letter-spacing: 0.04em;
      animation: pulseAlert 2s infinite ease-in-out;
    }
    @keyframes pulseAlert {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .badge-ordered {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .badge-inprogress {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }
    .badge-completed {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-cancelled {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .tests-count-pill {
      background: #0f172a;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .btn-action.view-btn {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-action.view-btn:hover {
      background: rgba(59, 130, 246, 0.3);
    }

    /* Expandable Row Details */
    .expanded-row {
      background: #141e33 !important;
    }
    .expanded-cell {
      padding: 0 1.5rem 1.5rem 3rem !important;
      border-bottom: 2px solid #334155;
    }
    .details-panel {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .details-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #334155;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-val {
      font-size: 0.875rem;
      color: #f1f5f9;
    }

    .items-table-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sub-table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sub-table-header h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: #cbd5e1;
    }
    .items-total {
      font-size: 0.85rem;
      font-weight: 700;
      color: #34d399;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .sub-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.825rem;
    }
    .sub-table th {
      background: #0f172a;
      padding: 0.5rem 0.85rem;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid #334155;
    }
    .sub-table td {
      padding: 0.55rem 0.85rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      color: #f1f5f9;
    }
    .sub-code-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
      background: #0f172a;
      color: #38bdf8;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.85);
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
      max-width: 680px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
    }
    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .modal-title-wrap h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }
    .modal-icon {
      font-size: 1.2rem;
    }

    .modal-form {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.02em;
    }
    .form-group input,
    .form-group select {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      padding: 0.65rem 0.85rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus {
      border-color: #3b82f6;
    }
    .form-group select.invalid {
      border-color: #ef4444;
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }

    /* Tests Selection in Modal */
    .tests-selection-section {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .tests-section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .section-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: #f1f5f9;
      display: block;
    }
    .section-subtext {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .test-selection-stats {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .selected-pill {
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }
    .price-pill {
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .modal-test-search {
      position: relative;
      display: flex;
      align-items: center;
    }
    .test-search-input {
      width: 100%;
      background: #1e293b;
    }

    .tests-list-box {
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #1e293b;
      display: flex;
      flex-direction: column;
    }
    .empty-tests {
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }

    .test-check-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      cursor: pointer;
      transition: background 0.15s;
    }
    .test-check-item:last-child {
      border-bottom: none;
    }
    .test-check-item:hover {
      background: #27354f;
    }
    .test-check-item.checked {
      background: rgba(59, 130, 246, 0.15);
    }
    .test-check-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #3b82f6;
      cursor: pointer;
    }
    .test-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .test-title-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .test-check-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      font-weight: 700;
    }
    .test-check-name {
      font-size: 0.85rem;
      color: #f1f5f9;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .test-sub-line {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .test-cat {
      color: #c084fc;
    }
    .test-check-price {
      font-size: 0.85rem;
      font-weight: 700;
      color: #34d399;
      white-space: nowrap;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #334155;
    }
  `]
})
export class LabOrdersComponent implements OnInit {
  private labService = inject(LaboratoryServicePort);
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  // Enums for Template Access
  readonly LabPriority = LabPriority;
  readonly LabOrderStatus = LabOrderStatus;

  // Data Signals
  orders = signal<LabOrder[]>([]);
  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);
  availableTests = signal<LabTest[]>([]);

  // Filter Signals
  searchQuery = signal<string>('');
  priorityFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  // UI State Signals
  expandedOrderId = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  orderSubmittedAttempt = signal<boolean>(false);

  // Test Selection in Modal Signals
  selectedTestIds = signal<number[]>([]);
  modalTestSearch = signal<string>('');

  // Alerts
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Filtered Orders Computed
  filteredOrders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const pFilter = this.priorityFilter();
    const sFilter = this.statusFilter();

    return this.orders().filter(order => {
      const matchesSearch =
        !q ||
        order.id.toString().includes(q) ||
        (order.patientName && order.patientName.toLowerCase().includes(q)) ||
        (order.doctorName && order.doctorName.toLowerCase().includes(q)) ||
        (order.clinicalNotes && order.clinicalNotes.toLowerCase().includes(q));

      const matchesPriority =
        pFilter === 'ALL' || order.priority.toString() === pFilter;

      const matchesStatus =
        sFilter === 'ALL' || order.status.toString() === sFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  });

  // Modal Filtered Tests Computed
  modalFilteredTests = computed(() => {
    const q = this.modalTestSearch().trim().toLowerCase();
    if (!q) return this.availableTests();

    return this.availableTests().filter(t =>
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  // Selected Total Estimated Price
  selectedTotalEstimatedPrice = computed(() => {
    const ids = new Set(this.selectedTestIds());
    return this.availableTests()
      .filter(t => ids.has(t.id))
      .reduce((sum, t) => sum + (t.price || 0), 0);
  });

  // Form
  orderForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    priority: [LabPriority.Routine, Validators.required],
    clinicalNotes: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      ordersRes: this.labService.getLabOrders(),
      patientsRes: this.clinicalService.getPatients(),
      doctorsRes: this.clinicalService.getDoctors(),
      testsRes: this.labService.getLabTests()
    }).subscribe({
      next: res => {
        this.orders.set(res.ordersRes.data || []);
        this.patients.set(res.patientsRes.data || []);
        this.doctors.set(res.doctorsRes.data || []);
        this.availableTests.set(res.testsRes.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load laboratory data.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onPriorityFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.priorityFilter.set(val);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(val);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.priorityFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  toggleExpand(orderId: number): void {
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }

  calculateOrderTotal(order: LabOrder): number {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum, it) => sum + (it.price || 0), 0);
  }

  getPriorityLabel(priority: LabPriority, priorityName?: string): string {
    if (priorityName) return priorityName;
    return LabPriorityNames[priority] || 'Routine';
  }

  getPriorityClass(priority: LabPriority): string {
    switch (priority) {
      case LabPriority.Routine:
        return 'badge-routine';
      case LabPriority.Urgent:
        return 'badge-urgent';
      case LabPriority.Stat:
        return 'badge-stat';
      default:
        return 'badge-routine';
    }
  }

  getStatusLabel(status: LabOrderStatus, statusName?: string): string {
    if (statusName) return statusName;
    switch (status) {
      case LabOrderStatus.Ordered:
        return 'Ordered';
      case LabOrderStatus.InProgress:
        return 'InProgress';
      case LabOrderStatus.Completed:
        return 'Completed';
      case LabOrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStatusClass(status: LabOrderStatus): string {
    switch (status) {
      case LabOrderStatus.Ordered:
        return 'badge-ordered';
      case LabOrderStatus.InProgress:
        return 'badge-inprogress';
      case LabOrderStatus.Completed:
        return 'badge-completed';
      case LabOrderStatus.Cancelled:
        return 'badge-cancelled';
      default:
        return 'badge-ordered';
    }
  }

  isFieldInvalid(name: string): boolean {
    const ctrl = this.orderForm.get(name);
    return !!(ctrl && (ctrl.touched || this.orderSubmittedAttempt()) && ctrl.invalid);
  }

  // Modal Management
  openCreateModal(): void {
    this.orderForm.reset({
      patientId: '',
      doctorId: '',
      priority: LabPriority.Routine,
      clinicalNotes: ''
    });
    this.selectedTestIds.set([]);
    this.modalTestSearch.set('');
    this.orderSubmittedAttempt.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.orderForm.reset();
    this.selectedTestIds.set([]);
    this.orderSubmittedAttempt.set(false);
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onModalTestSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.modalTestSearch.set(val);
  }

  isTestSelected(testId: number): boolean {
    return this.selectedTestIds().includes(testId);
  }

  toggleTestSelection(testId: number): void {
    const current = this.selectedTestIds();
    if (current.includes(testId)) {
      this.selectedTestIds.set(current.filter(id => id !== testId));
    } else {
      this.selectedTestIds.set([...current, testId]);
    }
  }

  onSubmitOrder(): void {
    this.orderSubmittedAttempt.set(true);

    if (this.orderForm.invalid || this.selectedTestIds().length === 0) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.orderForm.value;

    const dto: CreateLabOrderDto = {
      patientId: Number(val.patientId),
      doctorId: Number(val.doctorId),
      priority: Number(val.priority) as LabPriority,
      clinicalNotes: val.clinicalNotes ? val.clinicalNotes.trim() : undefined,
      testIds: this.selectedTestIds()
    };

    this.labService.createLabOrder(dto).subscribe({
      next: res => {
        this.showAlert(`Lab Order #${res.data?.id || ''} created successfully!`, 'success');
        this.closeModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to create laboratory order.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      this.alertMessage.set(null);
    }, 4000);
  }
}
