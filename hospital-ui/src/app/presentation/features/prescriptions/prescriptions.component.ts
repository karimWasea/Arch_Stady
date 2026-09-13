// ============================================================
// Presentation Layer — Prescriptions Component
// Clinical medication orders, dosages, schedules, and duration
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { Prescription, CreatePrescriptionDto, CreatePrescriptionItemDto, Patient, Doctor } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p>Issue and review clinician pharmacological prescriptions and dosing schedules</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">+ Issue New Prescription</button>
      </div>

      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          {{ alertMessage() }}
        </div>
      }

      <div class="content-card">
        <div class="table-actions">
          <input
            type="text"
            placeholder="Search prescriptions by patient or doctor..."
            (input)="onSearch($event)"
            class="search-input"
          />
          <span class="count-badge">{{ filteredPrescriptions().length }} Prescriptions</span>
        </div>

        @if (isLoading()) {
          <div class="loading-box">Loading prescriptions...</div>
        } @else if (filteredPrescriptions().length === 0) {
          <div class="empty-box">No prescriptions found.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Prescription #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Prescribed Date</th>
                  <th>Items Count</th>
                  <th>Notes</th>
                  <th class="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPrescriptions(); track p.id) {
                  <tr>
                    <td class="font-mono">#RX-{{ p.id }}</td>
                    <td class="font-semibold">{{ p.patientName }}</td>
                    <td class="text-muted">{{ p.doctorName }}</td>
                    <td>{{ p.prescriptionDate | date:'mediumDate' }}</td>
                    <td>
                      <span class="count-pill">{{ p.items?.length || 0 }} Meds</span>
                    </td>
                    <td class="text-secondary text-truncate">{{ p.notes || '—' }}</td>
                    <td class="text-right">
                      <button (click)="toggleExpand(p.id)" class="btn-action">
                        {{ expandedId() === p.id ? 'Hide Items ▲' : 'View Items ▼' }}
                      </button>
                    </td>
                  </tr>

                  <!-- Expanded Medication Items -->
                  @if (expandedId() === p.id) {
                    <tr class="expanded-row">
                      <td colspan="7">
                        <div class="items-card">
                          <h4>Prescribed Medications</h4>
                          @if (!p.items || p.items.length === 0) {
                            <p class="text-muted">No items recorded in this prescription.</p>
                          } @else {
                            <table class="nested-table">
                              <thead>
                                <tr>
                                  <th>Medication</th>
                                  <th>Dosage</th>
                                  <th>Frequency</th>
                                  <th>Duration</th>
                                  <th>Instructions</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (item of p.items; track item.id) {
                                  <tr>
                                    <td class="font-semibold">{{ item.medicationName }}</td>
                                    <td>{{ item.dosage }}</td>
                                    <td>{{ item.frequency }}</td>
                                    <td>{{ item.duration }}</td>
                                    <td class="text-muted">{{ item.instructions || '—' }}</td>
                                  </tr>
                                }
                              </tbody>
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

      <!-- Create Prescription Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Issue New Prescription</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="rxForm" (ngSubmit)="onSubmit()" class="rx-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Patient *</label>
                  <select formControlName="patientId">
                    <option value="">Select Patient</option>
                    @for (pt of patients(); track pt.id) {
                      <option [value]="pt.id">{{ pt.firstName }} {{ pt.lastName }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Doctor *</label>
                  <select formControlName="doctorId">
                    <option value="">Select Doctor</option>
                    @for (doc of doctors(); track doc.id) {
                      <option [value]="doc.id">Dr. {{ doc.firstName }} {{ doc.lastName }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Clinical Notes</label>
                <input type="text" formControlName="notes" placeholder="e.g. Post-op antibiotics, take with meals" />
              </div>

              <!-- Prescription Items Section -->
              <div class="items-section">
                <div class="items-header">
                  <h4>Medications ({{ itemsArray.length }})</h4>
                  <button type="button" (click)="addItem()" class="btn-add-item">+ Add Medicine</button>
                </div>

                @for (itemGroup of itemsArray.controls; track $index) {
                  <div [formGroup]="$any(itemGroup)" class="item-card">
                    <div class="item-card-header">
                      <span class="item-badge">Medication #{{ $index + 1 }}</span>
                      @if (itemsArray.length > 1) {
                        <button type="button" (click)="removeItem($index)" class="btn-remove-item">Remove</button>
                      }
                    </div>
                    <div class="item-grid">
                      <div class="form-group">
                        <label>Medication Name *</label>
                        <input type="text" formControlName="medicationName" placeholder="Amoxicillin 500mg" />
                      </div>
                      <div class="form-group">
                        <label>Dosage *</label>
                        <input type="text" formControlName="dosage" placeholder="500mg" />
                      </div>
                      <div class="form-group">
                        <label>Frequency *</label>
                        <input type="text" formControlName="frequency" placeholder="3 times daily" />
                      </div>
                      <div class="form-group">
                        <label>Duration *</label>
                        <input type="text" formControlName="duration" placeholder="7 days" />
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Instructions</label>
                      <input type="text" formControlName="instructions" placeholder="Take after meals with a full glass of water" />
                    </div>
                  </div>
                }
              </div>

              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="rxForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Issuing...' : 'Issue Prescription' }}
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
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
    }
    .page-header p {
      color: #64748b;
      font-size: 0.95rem;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    }
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .content-card {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .table-actions {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .search-input {
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      width: 340px;
      font-size: 0.875rem;
    }
    .count-badge {
      font-size: 0.8rem;
      background: #f1f5f9;
      color: #475569;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-weight: 600;
    }
    .count-pill {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8rem;
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
      background: #f8fafc;
      padding: 0.75rem 1.5rem;
      color: #475569;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 0.85rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .data-table tr:hover { background: #f8fafc; }
    .font-mono { font-family: monospace; color: #64748b; }
    .font-semibold { font-weight: 600; }
    .text-muted { color: #64748b; }
    .text-secondary { color: #475569; }
    .text-truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .text-right { text-align: right; }
    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #bae6fd;
      background: #f0f9ff;
      color: #0284c7;
    }
    .btn-action:hover { background: #e0f2fe; }
    .expanded-row td {
      background: #f8fafc;
      padding: 1.25rem 2rem;
    }
    .items-card {
      background: white;
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      border: 1px solid #e2e8f0;
    }
    .items-card h4 {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }
    .nested-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .nested-table th {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-weight: 600;
    }
    .nested-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .loading-box, .empty-box {
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-card {
      background: white;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 650px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      overflow: hidden;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .rx-form {
      padding: 1.5rem;
      overflow-y: auto;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-group {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .form-group input, .form-group select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: white;
    }
    .items-section {
      margin-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .items-header h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }
    .btn-add-item {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-add-item:hover { background: #dcfce7; }
    .item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.85rem;
      margin-bottom: 0.75rem;
    }
    .item-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .item-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
    }
    .btn-remove-item {
      background: transparent;
      border: none;
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .item-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.5fr 1fr;
      gap: 0.5rem;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `]
})
export class PrescriptionsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  prescriptions = signal<Prescription[]>([]);
  filteredPrescriptions = signal<Prescription[]>([]);
  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);

  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  expandedId = signal<number | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  rxForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    notes: [''],
    items: this.fb.array([])
  });

  get itemsArray(): FormArray {
    return this.rxForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      rx: this.clinicalService.getPrescriptions(),
      patients: this.clinicalService.getPatients(),
      doctors: this.clinicalService.getDoctors()
    }).subscribe({
      next: res => {
        const list = res.rx.data || [];
        this.prescriptions.set(list);
        this.filteredPrescriptions.set(list);
        this.patients.set(res.patients.data || []);
        this.doctors.set(res.doctors.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load prescriptions.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredPrescriptions.set(
      this.prescriptions().filter(p =>
        p.patientName.toLowerCase().includes(query) ||
        p.doctorName.toLowerCase().includes(query)
      )
    );
  }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  openCreateModal(): void {
    this.rxForm.reset({ patientId: '', doctorId: '', notes: '' });
    this.itemsArray.clear();
    this.addItem(); // add at least one item
    this.showModal.set(true);
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      medicationName: ['', Validators.required],
      dosage: ['', Validators.required],
      frequency: ['', Validators.required],
      duration: ['', Validators.required],
      instructions: ['']
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.rxForm.reset();
  }

  onSubmit(): void {
    if (this.rxForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.rxForm.value;
    const itemsDto: CreatePrescriptionItemDto[] = this.itemsArray.value.map((it: any) => ({
      medicationName: it.medicationName,
      dosage: it.dosage,
      frequency: it.frequency,
      duration: it.duration,
      instructions: it.instructions || undefined
    }));

    const dto: CreatePrescriptionDto = {
      patientId: Number(val.patientId),
      doctorId: Number(val.doctorId),
      notes: val.notes || undefined,
      items: itemsDto
    };

    this.clinicalService.createPrescription(dto).subscribe({
      next: () => {
        this.showAlert('Prescription issued successfully.', 'success');
        this.closeModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.showAlert('Failed to issue prescription.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
