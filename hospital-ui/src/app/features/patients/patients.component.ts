import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HospitalService } from '../../core/services/hospital.service';
import { Patient } from '../../core/models/hospital.models';

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
        <button (click)="showModal.set(true)" class="btn-primary">+ Register New Patient</button>
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
            placeholder="Search patients by name or email..."
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
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPatients(); track p.id) {
                  <tr>
                    <td>#{{ p.id }}</td>
                    <td class="font-semibold">{{ p.firstName }} {{ p.lastName }}</td>
                    <td>{{ p.dateOfBirth | date:'mediumDate' }}</td>
                    <td><span class="gender-pill">{{ p.gender }}</span></td>
                    <td>{{ p.phone }}</td>
                    <td>{{ p.email || '—' }}</td>
                    <td class="text-muted">{{ p.address }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Register Patient Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Register New Patient</h3>
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
                <label>Residential Address</label>
                <input type="text" formControlName="address" placeholder="123 Hospital St, City" />
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeModal()" class="btn-cancel">Cancel</button>
                <button type="submit" [disabled]="patientForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : 'Register Patient' }}
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
    .search-input:focus { border-color: #0284c7; }
    .count-badge { font-size: 0.8rem; color: #64748b; font-weight: 600; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
    .data-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .font-semibold { font-weight: 600; }
    .text-muted { color: #94a3b8; }
    .gender-pill { background: #f1f5f9; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .loading-box, .empty-box { padding: 3rem; text-align: center; color: #64748b; }
    .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* Modal */
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
  private fb = inject(FormBuilder);
  private hospitalService = inject(HospitalService);

  patients = signal<Patient[]>([]);
  filteredPatients = signal<Patient[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  patientForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    address: ['']
  });

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.hospitalService.getPatients().subscribe({
      next: (res: any) => {
        const data = res.data || [];
        this.patients.set(data);
        this.filteredPatients.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    if (!term) {
      this.filteredPatients.set(this.patients());
      return;
    }
    this.filteredPatients.set(
      this.patients().filter(p =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      )
    );
  }

  closeModal(): void {
    this.showModal.set(false);
    this.patientForm.reset({ gender: 'Male' });
  }

  onSubmit(): void {
    if (this.patientForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.patientForm.value;

    this.hospitalService.createPatient({
      firstName: formVal.firstName!,
      lastName: formVal.lastName!,
      dateOfBirth: new Date(formVal.dateOfBirth!).toISOString(),
      gender: formVal.gender!,
      phone: formVal.phone!,
      email: formVal.email || '',
      address: formVal.address || ''
    }).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.alertType.set('success');
        this.alertMessage.set(`Patient ${res.data.firstName} ${res.data.lastName} registered successfully.`);
        this.loadPatients();
        setTimeout(() => this.alertMessage.set(null), 4000);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.alertType.set('error');
        this.alertMessage.set(err.error?.message || 'Failed to register patient.');
      }
    });
  }
}
