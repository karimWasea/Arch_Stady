// ============================================================
// Presentation Layer — Patients Component
// Full patient records directory with CRUD operations
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { Patient, CreatePatientDto, UpdatePatientDto } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Patients Directory</h1>
          <p>Register, inspect, and manage hospital patient medical profiles</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">+ Register New Patient</button>
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
            placeholder="Search patients by name, phone or email..."
            (input)="onSearch($event)"
            class="search-input"
          />
          <span class="count-badge">{{ filteredPatients().length }} Patients</span>
        </div>

        @if (isLoading()) {
          <div class="loading-box">Loading patients directory...</div>
        } @else if (filteredPatients().length === 0) {
          <div class="empty-box">No patients found.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPatients(); track p.id) {
                  <tr>
                    <td class="font-mono">#{{ p.id }}</td>
                    <td class="font-semibold">{{ p.firstName }} {{ p.lastName }}</td>
                    <td>{{ p.dateOfBirth | date:'mediumDate' }}</td>
                    <td><span class="gender-pill">{{ p.gender }}</span></td>
                    <td>{{ p.phone }}</td>
                    <td>{{ p.email || '—' }}</td>
                    <td class="text-muted">{{ p.address }}</td>
                    <td class="text-right actions-cell">
                      <button (click)="openEditModal(p)" class="btn-action edit" title="Edit patient">
                        ✏️ Edit
                      </button>
                      <button (click)="onDelete(p)" class="btn-action delete" title="Delete patient">
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Register / Edit Patient Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ isEditing() ? 'Edit Patient Profile' : 'Register New Patient' }}</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="patientForm" (ngSubmit)="onSubmit()" class="patient-form">
              <div class="form-row">
                <div class="form-group">
                  <label>First Name *</label>
                  <input type="text" formControlName="firstName" placeholder="John" />
                </div>
                <div class="form-group">
                  <label>Last Name *</label>
                  <input type="text" formControlName="lastName" placeholder="Doe" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Date of Birth *</label>
                  <input type="date" formControlName="dateOfBirth" />
                </div>
                <div class="form-group">
                  <label>Gender *</label>
                  <select formControlName="gender">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" formControlName="phone" placeholder="+1-555-0100" />
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input type="email" formControlName="email" placeholder="patient@example.com" />
                </div>
              </div>

              <div class="form-group">
                <label>Residential Address *</label>
                <input type="text" formControlName="address" placeholder="123 Hospital St, City" />
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeModal()" class="btn-cancel">Cancel</button>
                <button type="submit" [disabled]="patientForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Update Patient' : 'Register Patient') }}
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
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    p { color: #64748b; margin: 0; }
    .btn-primary {
      background: #0284c7;
      color: white;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .content-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .table-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
    }
    .search-input {
      padding: 0.65rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      width: 100%;
      max-width: 380px;
      outline: none;
    }
    .count-badge { font-size: 0.8rem; color: #64748b; font-weight: 600; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
    .data-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .font-mono { font-family: monospace; color: #64748b; }
    .font-semibold { font-weight: 600; }
    .text-muted { color: #94a3b8; }
    .gender-pill { background: #f1f5f9; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .text-right { text-align: right; }
    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-action.edit {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }
    .btn-action.edit:hover { background: #e0f2fe; }
    .btn-action.delete {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .btn-action.delete:hover { background: #fee2e2; }
    .loading-box, .empty-box { padding: 3rem; text-align: center; color: #64748b; }
    .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-card {
      background: white;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 540px;
      padding: 1.75rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
    .patient-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .form-group input, .form-group select {
      padding: 0.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      outline: none;
    }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    .btn-cancel {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      color: #475569;
    }
  `]
})
export class PatientsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  patients = signal<Patient[]>([]);
  filteredPatients = signal<Patient[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  patientForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.email]],
    address: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading.set(true);
    this.clinicalService.getPatients().subscribe({
      next: res => {
        const list = res.data || [];
        this.patients.set(list);
        this.filteredPatients.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load patients.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredPatients.set(
      this.patients().filter(p =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        p.phone.includes(query)
      )
    );
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.patientForm.reset({ gender: 'Male' });
    this.showModal.set(true);
  }

  openEditModal(patient: Patient): void {
    this.isEditing.set(true);
    this.editingId.set(patient.id);
    const dobFormatted = patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '';
    this.patientForm.patchValue({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: dobFormatted,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.patientForm.reset({ gender: 'Male' });
  }

  onSubmit(): void {
    if (this.patientForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.patientForm.value;
    const dto: CreatePatientDto = {
      firstName: val.firstName!,
      lastName: val.lastName!,
      dateOfBirth: val.dateOfBirth!,
      gender: val.gender!,
      phone: val.phone!,
      email: val.email || '',
      address: val.address!
    };

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdatePatientDto = { ...dto };
      this.clinicalService.updatePatient(this.editingId()!, updateDto).subscribe({
        next: () => {
          this.showAlert('Patient profile updated.', 'success');
          this.closeModal();
          this.loadPatients();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to update patient.', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.clinicalService.createPatient(dto).subscribe({
        next: () => {
          this.showAlert('Patient registered successfully.', 'success');
          this.closeModal();
          this.loadPatients();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to register patient.', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onDelete(patient: Patient): void {
    if (!confirm(`Are you sure you want to delete patient "${patient.firstName} ${patient.lastName}"?`)) return;

    this.clinicalService.deletePatient(patient.id).subscribe({
      next: () => {
        this.showAlert(`Patient "${patient.firstName} ${patient.lastName}" deleted.`, 'success');
        this.loadPatients();
      },
      error: () => {
        this.showAlert('Failed to delete patient.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
