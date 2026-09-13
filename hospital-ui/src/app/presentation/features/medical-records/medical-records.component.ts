// ============================================================
// Presentation Layer — Medical Records Component
// Patient clinical diagnoses, symptoms, treatments, and medical history
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { MedicalRecord, CreateMedicalRecordDto, UpdateMedicalRecordDto, Patient, Doctor } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Patient Medical Records</h1>
          <p>Document patient encounters, clinical diagnoses, and prescribed treatments</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">+ Add Medical Record</button>
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
            placeholder="Search records by diagnosis, symptoms, or patient..."
            (input)="onSearch($event)"
            class="search-input"
          />
          <div class="filter-actions">
            <select (change)="onFilterPatient($event)" class="patient-filter">
              <option value="">All Patients</option>
              @for (p of patients(); track p.id) {
                <option [value]="p.id">{{ p.firstName }} {{ p.lastName }}</option>
              }
            </select>
            <span class="count-badge">{{ filteredRecords().length }} Records</span>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-box">Loading medical history...</div>
        } @else if (filteredRecords().length === 0) {
          <div class="empty-box">No medical records found.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>Symptoms</th>
                  <th>Treatment</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filteredRecords(); track r.id) {
                  <tr>
                    <td class="font-mono">#{{ r.id }}</td>
                    <td class="font-semibold">{{ r.patientName }}</td>
                    <td class="text-muted">{{ r.doctorName }}</td>
                    <td><span class="diagnosis-badge">{{ r.diagnosis }}</span></td>
                    <td class="text-secondary text-truncate" [title]="r.symptoms">{{ r.symptoms }}</td>
                    <td class="text-secondary text-truncate" [title]="r.treatment">{{ r.treatment }}</td>
                    <td>{{ r.createdAt | date:'mediumDate' }}</td>
                    <td class="text-right">
                      <button (click)="openEditModal(r)" class="btn-action edit" title="Edit Record">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create / Edit Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ isEditing() ? 'Edit Medical Record' : 'Create Medical Record' }}</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="recordForm" (ngSubmit)="onSubmit()" class="record-form">
              @if (!isEditing()) {
                <div class="form-row">
                  <div class="form-group">
                    <label>Patient *</label>
                    <select formControlName="patientId">
                      <option value="">Select Patient</option>
                      @for (p of patients(); track p.id) {
                        <option [value]="p.id">{{ p.firstName }} {{ p.lastName }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Attending Doctor *</label>
                    <select formControlName="doctorId">
                      <option value="">Select Doctor</option>
                      @for (d of doctors(); track d.id) {
                        <option [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }} ({{ d.specialization }})</option>
                      }
                    </select>
                  </div>
                </div>
              }

              <div class="form-group">
                <label>Diagnosis *</label>
                <input type="text" formControlName="diagnosis" placeholder="Primary clinical diagnosis..." />
              </div>

              <div class="form-group">
                <label>Symptoms *</label>
                <textarea formControlName="symptoms" rows="2" placeholder="Reported symptoms and clinical observations..."></textarea>
              </div>

              <div class="form-group">
                <label>Treatment Plan *</label>
                <textarea formControlName="treatment" rows="2" placeholder="Therapeutic procedures, care plans, or therapies..."></textarea>
              </div>

              <div class="form-group">
                <label>Additional Clinical Notes</label>
                <textarea formControlName="notes" rows="2" placeholder="Optional notes..."></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="recordForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Update Record' : 'Save Record') }}
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
      flex-wrap: wrap;
      gap: 1rem;
    }
    .search-input {
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      width: 340px;
      font-size: 0.875rem;
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .patient-filter {
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: white;
    }
    .count-badge {
      font-size: 0.8rem;
      background: #f1f5f9;
      color: #475569;
      padding: 0.25rem 0.65rem;
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
    .diagnosis-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8rem;
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
      max-width: 580px;
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
    .record-form {
      padding: 1.5rem;
      overflow-y: auto;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .form-group input, .form-group textarea, .form-group select {
      padding: 0.55rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: white;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `]
})
export class MedicalRecordsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  records = signal<MedicalRecord[]>([]);
  filteredRecords = signal<MedicalRecord[]>([]);
  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);

  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  recordForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    diagnosis: ['', Validators.required],
    symptoms: ['', Validators.required],
    treatment: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      records: this.clinicalService.getMedicalRecords(),
      patients: this.clinicalService.getPatients(),
      doctors: this.clinicalService.getDoctors()
    }).subscribe({
      next: res => {
        const rList = res.records.data || [];
        this.records.set(rList);
        this.filteredRecords.set(rList);
        this.patients.set(res.patients.data || []);
        this.doctors.set(res.doctors.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load medical records data.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredRecords.set(
      this.records().filter(r =>
        r.patientName.toLowerCase().includes(query) ||
        r.diagnosis.toLowerCase().includes(query) ||
        r.symptoms.toLowerCase().includes(query) ||
        r.treatment.toLowerCase().includes(query)
      )
    );
  }

  onFilterPatient(event: Event): void {
    const pId = (event.target as HTMLSelectElement).value;
    if (!pId) {
      this.filteredRecords.set(this.records());
    } else {
      this.filteredRecords.set(this.records().filter(r => r.patientId === Number(pId)));
    }
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.recordForm.reset({ patientId: '', doctorId: '', diagnosis: '', symptoms: '', treatment: '', notes: '' });
    this.showModal.set(true);
  }

  openEditModal(record: MedicalRecord): void {
    this.isEditing.set(true);
    this.editingId.set(record.id);
    this.recordForm.patchValue({
      patientId: String(record.patientId),
      doctorId: String(record.doctorId),
      diagnosis: record.diagnosis,
      symptoms: record.symptoms,
      treatment: record.treatment,
      notes: record.notes || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.recordForm.reset();
  }

  onSubmit(): void {
    if (this.recordForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.recordForm.value;

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdateMedicalRecordDto = {
        diagnosis: val.diagnosis!,
        symptoms: val.symptoms!,
        treatment: val.treatment!,
        notes: val.notes || undefined
      };
      this.clinicalService.updateMedicalRecord(this.editingId()!, updateDto).subscribe({
        next: () => {
          this.showAlert('Medical record updated.', 'success');
          this.closeModal();
          this.loadData();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to update medical record.', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      const createDto: CreateMedicalRecordDto = {
        patientId: Number(val.patientId),
        doctorId: Number(val.doctorId),
        diagnosis: val.diagnosis!,
        symptoms: val.symptoms!,
        treatment: val.treatment!,
        notes: val.notes || undefined
      };
      this.clinicalService.createMedicalRecord(createDto).subscribe({
        next: () => {
          this.showAlert('Medical record recorded successfully.', 'success');
          this.closeModal();
          this.loadData();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to record medical record.', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
