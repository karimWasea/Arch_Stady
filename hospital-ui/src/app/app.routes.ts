// ============================================================
// Application Routing Configuration
// Standalone lazy-loaded routes with authGuard protection
// ============================================================

import { Routes } from '@angular/router';
import { authGuard } from './infrastructure/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./presentation/features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./presentation/features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // ── Clinical Subsystem ──────────────────────────────────────
  {
    path: 'patients',
    loadComponent: () =>
      import('./presentation/features/patients/patients.component').then(m => m.PatientsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'doctors',
    loadComponent: () =>
      import('./presentation/features/doctors/doctors.component').then(m => m.DoctorsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./presentation/features/departments/departments.component').then(m => m.DepartmentsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'appointments',
    loadComponent: () =>
      import('./presentation/features/appointments/appointments.component').then(m => m.AppointmentsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'medical-records',
    loadComponent: () =>
      import('./presentation/features/medical-records/medical-records.component').then(m => m.MedicalRecordsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'prescriptions',
    loadComponent: () =>
      import('./presentation/features/prescriptions/prescriptions.component').then(m => m.PrescriptionsComponent),
    canActivate: [authGuard]
  },

  // ── Pharmacy Subsystem ──────────────────────────────────────
  {
    path: 'pharmacy/medicines',
    loadComponent: () =>
      import('./presentation/features/pharmacy/medicines/medicines.component').then(m => m.MedicinesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pharmacy/stocks',
    loadComponent: () =>
      import('./presentation/features/pharmacy/stocks/stocks.component').then(m => m.StocksComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pharmacy/dispensing',
    loadComponent: () =>
      import('./presentation/features/pharmacy/dispensing/dispensing.component').then(m => m.DispensingComponent),
    canActivate: [authGuard]
  },

  // ── Laboratory Subsystem ────────────────────────────────────
  {
    path: 'laboratory/tests',
    loadComponent: () =>
      import('./presentation/features/laboratory/tests/tests.component').then(m => m.LabTestsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'laboratory/orders',
    loadComponent: () =>
      import('./presentation/features/laboratory/orders/orders.component').then(m => m.LabOrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'laboratory/results',
    loadComponent: () =>
      import('./presentation/features/laboratory/results/results.component').then(m => m.LabResultsComponent),
    canActivate: [authGuard]
  },

  // ── Billing Subsystem ───────────────────────────────────────
  {
    path: 'billing/insurance',
    loadComponent: () =>
      import('./presentation/features/billing/insurance/insurance.component').then(m => m.InsuranceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/invoices',
    loadComponent: () =>
      import('./presentation/features/billing/invoices/invoices.component').then(m => m.InvoicesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/payments',
    loadComponent: () =>
      import('./presentation/features/billing/payments/payments.component').then(m => m.PaymentsComponent),
    canActivate: [authGuard]
  },

  // ── Wildcard Fallback ───────────────────────────────────────
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
