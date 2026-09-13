// ============================================================
// Presentation Layer — Lab Results Component
// Inspect and record laboratory test diagnostic findings
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LaboratoryServicePort } from '../../../../application/ports/laboratory.port';
import { LabOrder, LabOrderItem, LabResult, RecordLabResultDto } from '../../../../domain/models/laboratory.models';
import { LabPriority, LabOrderStatus, LabPriorityNames } from '../../../../domain/enums/enums';

interface TestWithResult {
  item: LabOrderItem;
  result: LabResult | null;
}

@Component({
  selector: 'app-lab-results',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <h1>📑 Diagnostic Results Entry & Review</h1>
          <p>Record laboratory findings, detect abnormal clinical values, and verify diagnostic reports</p>
        </div>
        @if (selectedOrder()) {
          <button (click)="openRecordModal()" class="btn-primary">
            <span>+</span> Record Result
          </button>
        }
      </div>

      <!-- Alert Notification -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✓' : '⚠️' }}</span>
          <span>{{ alertMessage() }}</span>
        </div>
      }

      <!-- Order Selector Section -->
      <div class="selector-card">
        <div class="selector-header">
          <label for="orderSelect" class="selector-label">
            <span class="label-icon">🔍</span> Select Laboratory Order to Review:
          </label>
          <span class="orders-count">{{ orders().length }} Available Orders</span>
        </div>

        @if (isLoadingOrders()) {
          <div class="order-loading">
            <div class="mini-spinner"></div>
            <span>Loading orders list...</span>
          </div>
        } @else {
          <div class="selector-controls">
            <select
              id="orderSelect"
              class="order-dropdown"
              [value]="selectedOrderId() || ''"
              (change)="onOrderChange($event)"
            >
              <option value="">-- Choose an active requisition --</option>
              @for (order of orders(); track order.id) {
                <option [value]="order.id">
                  Order #{{ order.id }} — {{ order.patientName }} ({{ order.priorityName || getPriorityLabel(order.priority) }}) — {{ order.orderDate | date:'shortDate' }}
                </option>
              }
            </select>
          </div>
        }
      </div>

      <!-- Main Results Display Area -->
      @if (!selectedOrderId()) {
        <!-- No Order Selected Placeholder -->
        <div class="content-card empty-selection-card">
          <div class="placeholder-content">
            <span class="huge-icon">🔬</span>
            <h3>No Laboratory Order Selected</h3>
            <p>Please pick an order from the dropdown above to inspect ordered diagnostic tests and record clinical findings.</p>
          </div>
        </div>
      } @else if (isLoadingResults()) {
        <div class="content-card state-card">
          <div class="spinner"></div>
          <p>Retrieving diagnostic tests and laboratory findings...</p>
        </div>
      } @else if (selectedOrder()) {
        <!-- Selected Order Overview Card -->
        <div class="content-card order-summary-card">
          <div class="order-info-grid">
            <div class="info-block">
              <span class="info-label">Order Reference</span>
              <span class="info-val font-mono order-title">#{{ selectedOrder()!.id }}</span>
            </div>
            <div class="info-block">
              <span class="info-label">Patient</span>
              <span class="info-val font-semibold text-primary">{{ selectedOrder()!.patientName }}</span>
            </div>
            <div class="info-block">
              <span class="info-label">Ordering Physician</span>
              <span class="info-val text-secondary">Dr. {{ selectedOrder()!.doctorName }}</span>
            </div>
            <div class="info-block">
              <span class="info-label">Requisition Date</span>
              <span class="info-val font-mono text-secondary">{{ selectedOrder()!.orderDate | date:'mediumDate' }}</span>
            </div>
            <div class="info-block">
              <span class="info-label">Priority</span>
              <div>
                <span class="badge" [ngClass]="getPriorityClass(selectedOrder()!.priority)">
                  {{ getPriorityLabel(selectedOrder()!.priority, selectedOrder()!.priorityName) }}
                </span>
              </div>
            </div>
            <div class="info-block">
              <span class="info-label">Status</span>
              <div>
                <span class="badge" [ngClass]="getStatusClass(selectedOrder()!.status)">
                  {{ getStatusLabel(selectedOrder()!.status, selectedOrder()!.statusName) }}
                </span>
              </div>
            </div>
          </div>

          @if (selectedOrder()!.clinicalNotes) {
            <div class="notes-banner">
              <span class="notes-icon">📝</span>
              <div class="notes-body">
                <strong>Clinical Notes:</strong> {{ selectedOrder()!.clinicalNotes }}
              </div>
            </div>
          }

          <!-- Abnormal Findings Warning Banner -->
          @if (hasAbnormalFindings()) {
            <div class="abnormal-alert-banner">
              <span class="abnormal-alert-icon">⚠️</span>
              <div class="abnormal-alert-text">
                <strong>CRITICAL CLINICAL ALERT:</strong>
                <span>{{ abnormalCount() }} abnormal test {{ abnormalCount() === 1 ? 'result' : 'results' }} detected on this requisition. Requires clinical review.</span>
              </div>
            </div>
          }

          <!-- Completion Progress Bar -->
          <div class="progress-section">
            <div class="progress-labels">
              <span class="progress-title">Completion Status</span>
              <span class="progress-stats font-mono">
                {{ completedTestsCount() }} of {{ totalTestsCount() }} tests recorded ({{ completionPercentage() }}%)
              </span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                [style.width.%]="completionPercentage()"
                [class.complete]="completionPercentage() === 100"
              ></div>
            </div>
          </div>
        </div>

        <!-- Tests and Results Table Card -->
        <div class="content-card table-card">
          <div class="table-header-bar">
            <h3>Diagnostic Tests & Recorded Results</h3>
            <span class="count-badge">{{ totalTestsCount() }} Requisitioned Tests</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Test Code</th>
                  <th>Test Name</th>
                  <th>Result Value</th>
                  <th>Reference Range</th>
                  <th>Unit</th>
                  <th>Finding Status</th>
                  <th>Performed By</th>
                  <th>Date Recorded</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of testsWithResults(); track entry.item.id) {
                  <tr
                    [class.abnormal-row]="entry.result?.isAbnormal"
                    [class.pending-row]="!entry.result"
                  >
                    <td>
                      <span class="code-badge">{{ entry.item.testCode }}</span>
                    </td>
                    <td class="font-semibold text-primary">
                      {{ entry.item.testName }}
                    </td>

                    <!-- Result Value -->
                    <td>
                      @if (entry.result) {
                        <span
                          class="result-value font-mono font-bold"
                          [class.abnormal-value]="entry.result.isAbnormal"
                        >
                          {{ entry.result.resultValue }}
                        </span>
                      } @else {
                        <span class="text-muted font-italic">Not recorded</span>
                      }
                    </td>

                    <!-- Normal Range -->
                    <td class="font-mono text-range">
                      {{ entry.result?.normalRange || '—' }}
                    </td>

                    <!-- Unit of Measure -->
                    <td class="font-mono text-secondary">
                      {{ entry.result?.unitOfMeasure || '—' }}
                    </td>

                    <!-- Finding Status / Badge -->
                    <td>
                      @if (entry.result) {
                        @if (entry.result.isAbnormal) {
                          <span class="badge badge-abnormal">
                            <span class="pulse-icon">⚠️</span> ABNORMAL
                          </span>
                        } @else {
                          <span class="badge badge-normal">
                            ✓ Normal
                          </span>
                        }
                      } @else {
                        <span class="badge badge-pending">
                          ⏳ Pending
                        </span>
                      }
                    </td>

                    <!-- Performed By -->
                    <td class="text-secondary">
                      {{ entry.result?.performedBy || '—' }}
                    </td>

                    <!-- Date -->
                    <td class="text-secondary font-mono">
                      {{ entry.result ? (entry.result.performedDate | date:'short') : '—' }}
                    </td>

                    <!-- Action -->
                    <td class="text-right">
                      @if (entry.result) {
                        <button
                          (click)="openRecordModal(entry.item, entry.result)"
                          class="btn-action edit"
                          title="Update or amend recorded result"
                        >
                          ✏️ Update
                        </button>
                      } @else {
                        <button
                          (click)="openRecordModal(entry.item)"
                          class="btn-action record"
                          title="Record result for this test"
                        >
                          + Record
                        </button>
                      }
                    </td>
                  </tr>

                  <!-- Remarks Sub-row if Present -->
                  @if (entry.result?.remarks) {
                    <tr class="remarks-subrow" [class.abnormal-row]="entry.result?.isAbnormal">
                      <td colspan="9">
                        <div class="remarks-content">
                          <span class="remarks-label">Remarks:</span>
                          <span class="remarks-text">{{ entry.result?.remarks }}</span>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Record / Amend Result Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">🧪</span>
                <h3>{{ isEditingResult() ? 'Update Clinical Result' : 'Record Laboratory Result' }}</h3>
              </div>
              <button (click)="closeModal()" class="btn-close" type="button">&times;</button>
            </div>

            <form [formGroup]="resultForm" (ngSubmit)="onSubmitResult()" class="modal-form">
              <!-- Test Selection in Current Order -->
              <div class="form-group">
                <label>Diagnostic Test *</label>
                <select
                  formControlName="labTestId"
                  [class.invalid]="isFieldInvalid('labTestId')"
                >
                  <option value="">-- Select Test from Order #{{ selectedOrderId() }} --</option>
                  @for (it of selectedOrder()?.items || []; track it.id) {
                    <option [value]="it.labTestId">
                      {{ it.testName }} ({{ it.testCode }})
                    </option>
                  }
                </select>
                @if (isFieldInvalid('labTestId')) {
                  <span class="field-error">Please select a test</span>
                }
              </div>

              <!-- Result Value -->
              <div class="form-group">
                <label>Result Value *</label>
                <input
                  type="text"
                  formControlName="resultValue"
                  placeholder="e.g. 14.5 g/dL, Negative, 98 mg/dL, 4.2 x10^3/µL"
                  [class.invalid]="isFieldInvalid('resultValue')"
                />
                @if (isFieldInvalid('resultValue')) {
                  <span class="field-error">Result value is required</span>
                }
              </div>

              <!-- Abnormal Checkbox Callout -->
              <div class="abnormal-toggle-box" [class.highlighted]="resultForm.get('isAbnormal')?.value">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    formControlName="isAbnormal"
                    class="abnormal-checkbox"
                  />
                  <div class="toggle-text">
                    <div class="toggle-title">
                      <span class="alert-symbol">⚠️</span>
                      <strong>Flag as Abnormal / Out-of-Range Result</strong>
                    </div>
                    <span class="toggle-desc">
                      Check this box if findings exceed normal biological reference intervals or indicate pathological anomalies.
                    </span>
                  </div>
                </label>
              </div>

              <!-- Performed By -->
              <div class="form-group">
                <label>Performed By (Technician / Specialist) *</label>
                <input
                  type="text"
                  formControlName="performedBy"
                  placeholder="e.g. Lab Tech J. Smith, Pathologist Dr. Adams"
                  [class.invalid]="isFieldInvalid('performedBy')"
                />
                @if (isFieldInvalid('performedBy')) {
                  <span class="field-error">Performed by name is required</span>
                }
              </div>

              <!-- Remarks / Clinical Observations -->
              <div class="form-group">
                <label>Remarks & Observations (Optional)</label>
                <textarea
                  formControlName="remarks"
                  rows="3"
                  placeholder="e.g. Repeated twice to verify elevated levels, sample slightly hemolyzed..."
                ></textarea>
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
                  [disabled]="resultForm.invalid || isSubmitting()"
                  class="btn-primary"
                >
                  @if (isSubmitting()) {
                    <span class="mini-spinner"></span>
                    <span>Saving Result...</span>
                  } @else {
                    <span>{{ isEditingResult() ? 'Update Finding' : 'Commit Result' }}</span>
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
      margin-bottom: 1.75rem;
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

    /* Selector Card */
    .selector-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    .selector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .selector-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .label-icon {
      font-size: 1rem;
    }
    .orders-count {
      font-size: 0.75rem;
      color: #94a3b8;
      background: #0f172a;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid #334155;
    }
    .order-dropdown {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .order-dropdown:focus {
      border-color: #3b82f6;
    }
    .order-loading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #94a3b8;
      font-size: 0.875rem;
      padding: 0.5rem 0;
    }

    /* Cards */
    .content-card {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      margin-bottom: 1.5rem;
    }

    .empty-selection-card,
    .state-card {
      padding: 5rem 2rem;
      text-align: center;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .huge-icon {
      font-size: 3.5rem;
      opacity: 0.7;
      margin-bottom: 0.5rem;
    }
    .placeholder-content h3 {
      font-size: 1.25rem;
      color: #f1f5f9;
      margin-bottom: 0.5rem;
    }
    .placeholder-content p {
      max-width: 450px;
      margin: 0 auto;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    /* Order Summary Card */
    .order-summary-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .order-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1.25rem;
    }
    .info-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .info-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .info-val {
      font-size: 0.95rem;
      color: #f1f5f9;
    }
    .order-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #38bdf8;
    }

    .notes-banner {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: #cbd5e1;
    }
    .notes-icon {
      font-size: 1.1rem;
    }

    /* Abnormal Findings Alert Banner */
    .abnormal-alert-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      color: #fca5a5;
      font-size: 0.9rem;
      animation: alertGlow 2s infinite alternate ease-in-out;
    }
    @keyframes alertGlow {
      from { box-shadow: 0 0 5px rgba(239, 68, 68, 0.2); }
      to { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
    }
    .abnormal-alert-icon {
      font-size: 1.5rem;
    }
    .abnormal-alert-text strong {
      color: #f87171;
      margin-right: 0.4rem;
    }

    /* Progress Section */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #334155;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .progress-title {
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .progress-stats {
      color: #38bdf8;
      font-weight: 600;
    }
    .progress-track {
      height: 8px;
      background: #0f172a;
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 9999px;
      transition: width 0.4s ease-out;
    }
    .progress-fill.complete {
      background: #10b981;
    }

    /* Table Card */
    .table-card {
      margin-bottom: 2rem;
    }
    .table-header-bar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
    }
    .table-header-bar h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
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
    .data-table tbody tr {
      background: #1e293b;
      transition: background 0.15s;
    }
    .data-table tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.45);
    }
    .data-table tbody tr:hover {
      background: #334155;
    }

    /* Abnormal Highlight */
    .data-table tbody tr.abnormal-row {
      background: rgba(239, 68, 68, 0.08) !important;
      border-left: 3px solid #ef4444;
    }
    .data-table tbody tr.abnormal-row:hover {
      background: rgba(239, 68, 68, 0.15) !important;
    }

    .code-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      white-space: nowrap;
    }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-italic { font-style: italic; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-primary { color: #f1f5f9; }
    .text-secondary { color: #94a3b8; }
    .text-muted { color: #64748b; }
    .text-range { color: #a5f3fc; }
    .text-right { text-align: right; }

    .result-value {
      font-size: 0.95rem;
      color: #f1f5f9;
    }
    .result-value.abnormal-value {
      color: #f87171;
      font-weight: 800;
    }

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

    .badge-abnormal {
      background: rgba(239, 68, 68, 0.25);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.5);
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .pulse-icon {
      display: inline-block;
      animation: alertBounce 1s infinite alternate;
    }
    @keyframes alertBounce {
      from { transform: scale(1); }
      to { transform: scale(1.2); }
    }

    .badge-normal {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-pending {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .btn-action {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-action.record {
      background: #3b82f6;
      color: #ffffff;
    }
    .btn-action.record:hover {
      background: #2563eb;
    }
    .btn-action.edit {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .btn-action.edit:hover {
      background: rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }

    /* Remarks Sub-row */
    .remarks-subrow td {
      padding: 0.35rem 1.25rem 0.85rem 2.75rem !important;
      background: inherit;
    }
    .remarks-content {
      font-size: 0.8rem;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-style: italic;
    }
    .remarks-label {
      font-weight: 600;
      color: #94a3b8;
      font-style: normal;
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
      max-width: 580px;
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
    .form-group select,
    .form-group textarea {
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
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #3b82f6;
    }
    .form-group input.invalid,
    .form-group select.invalid {
      border-color: #ef4444;
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }

    /* Abnormal Checkbox Toggle */
    .abnormal-toggle-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      transition: all 0.2s;
    }
    .abnormal-toggle-box.highlighted {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
    }
    .abnormal-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #ef4444;
      cursor: pointer;
      margin-top: 0.15rem;
    }
    .toggle-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .toggle-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: #f1f5f9;
    }
    .alert-symbol {
      font-size: 0.95rem;
    }
    .toggle-desc {
      font-size: 0.75rem;
      color: #94a3b8;
      line-height: 1.4;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #334155;
    }

    /* Spinners */
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
  `]
})
export class LabResultsComponent implements OnInit {
  private labService = inject(LaboratoryServicePort);
  private fb = inject(FormBuilder);

  // Data Signals
  orders = signal<LabOrder[]>([]);
  selectedOrderId = signal<number | null>(null);
  orderResults = signal<LabResult[]>([]);

  // Loading Signals
  isLoadingOrders = signal<boolean>(true);
  isLoadingResults = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);

  // Editing State
  editingResult = signal<LabResult | null>(null);

  // Alerts
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Computed Properties
  selectedOrder = computed(() => {
    const id = this.selectedOrderId();
    if (!id) return null;
    return this.orders().find(o => o.id === id) || null;
  });

  isEditingResult = computed(() => this.editingResult() !== null);

  testsWithResults = computed<TestWithResult[]>(() => {
    const order = this.selectedOrder();
    if (!order || !order.items) return [];

    const resultsMap = new Map<number, LabResult>();
    this.orderResults().forEach(res => {
      resultsMap.set(res.labTestId, res);
    });

    return order.items.map(item => ({
      item,
      result: resultsMap.get(item.labTestId) || null
    }));
  });

  totalTestsCount = computed(() => {
    return this.selectedOrder()?.items?.length || 0;
  });

  completedTestsCount = computed(() => {
    return this.testsWithResults().filter(t => t.result !== null).length;
  });

  completionPercentage = computed(() => {
    const total = this.totalTestsCount();
    if (total === 0) return 0;
    return Math.round((this.completedTestsCount() / total) * 100);
  });

  abnormalCount = computed(() => {
    return this.orderResults().filter(r => r.isAbnormal).length;
  });

  hasAbnormalFindings = computed(() => {
    return this.abnormalCount() > 0;
  });

  // Form
  resultForm = this.fb.group({
    labTestId: ['', Validators.required],
    resultValue: ['', Validators.required],
    isAbnormal: [false],
    performedBy: ['', Validators.required],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoadingOrders.set(true);
    this.labService.getLabOrders().subscribe({
      next: res => {
        const orderList = res.data || [];
        this.orders.set(orderList);
        this.isLoadingOrders.set(false);

        // If an order was already selected, refresh it
        if (this.selectedOrderId()) {
          this.fetchResultsForOrder(this.selectedOrderId()!);
        }
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load laboratory orders.', 'error');
        this.isLoadingOrders.set(false);
      }
    });
  }

  onOrderChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (!val) {
      this.selectedOrderId.set(null);
      this.orderResults.set([]);
      return;
    }

    const orderId = Number(val);
    this.selectedOrderId.set(orderId);
    this.fetchResultsForOrder(orderId);
  }

  fetchResultsForOrder(orderId: number): void {
    this.isLoadingResults.set(true);
    this.labService.getResultsByOrder(orderId).subscribe({
      next: res => {
        this.orderResults.set(res.data || []);
        this.isLoadingResults.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to fetch diagnostic results.', 'error');
        this.isLoadingResults.set(false);
      }
    });
  }

  openRecordModal(item?: LabOrderItem, existingResult?: LabResult): void {
    if (!this.selectedOrderId()) return;

    if (existingResult) {
      this.editingResult.set(existingResult);
      this.resultForm.reset({
        labTestId: String(existingResult.labTestId),
        resultValue: existingResult.resultValue,
        isAbnormal: existingResult.isAbnormal,
        performedBy: existingResult.performedBy,
        remarks: existingResult.remarks || ''
      });
    } else {
      this.editingResult.set(null);
      this.resultForm.reset({
        labTestId: item ? String(item.labTestId) : '',
        resultValue: '',
        isAbnormal: false,
        performedBy: '',
        remarks: ''
      });
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingResult.set(null);
    this.resultForm.reset();
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  isFieldInvalid(name: string): boolean {
    const ctrl = this.resultForm.get(name);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  onSubmitResult(): void {
    if (this.resultForm.invalid || !this.selectedOrderId()) {
      this.resultForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.resultForm.value;

    const dto: RecordLabResultDto = {
      labOrderId: this.selectedOrderId()!,
      labTestId: Number(val.labTestId),
      resultValue: val.resultValue!.trim(),
      isAbnormal: Boolean(val.isAbnormal),
      performedBy: val.performedBy!.trim(),
      remarks: val.remarks ? val.remarks.trim() : undefined
    };

    this.labService.recordResult(dto).subscribe({
      next: res => {
        const testName = res.data?.testName || 'Diagnostic test';
        this.showAlert(`Result recorded for ${testName}.`, 'success');
        this.closeModal();
        this.fetchResultsForOrder(this.selectedOrderId()!);
        this.isSubmitting.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to record test result.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  getPriorityLabel(priority?: LabPriority, priorityName?: string): string {
    if (priorityName) return priorityName;
    if (!priority) return 'Routine';
    return LabPriorityNames[priority] || 'Routine';
  }

  getPriorityClass(priority?: LabPriority): string {
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

  getStatusLabel(status?: LabOrderStatus, statusName?: string): string {
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

  getStatusClass(status?: LabOrderStatus): string {
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

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      this.alertMessage.set(null);
    }, 4000);
  }
}
