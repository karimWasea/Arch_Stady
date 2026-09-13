// ============================================================
// Presentation Layer — Navbar Component
// ============================================================

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthServicePort } from '../../../application/ports/auth.port';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (authService.isAuthenticated()) {
      <header class="app-nav">
        <div class="nav-container">
          <div class="nav-brand">
            <span class="brand-icon">🏥</span>
            <span class="brand-name">Hospital<span class="brand-accent">Management</span></span>
            <span class="badge-arch">Step 3: Onion</span>
          </div>

          <div class="nav-user">
            <div class="user-info">
              <span class="user-name">{{ authService.currentUser()?.fullName }}</span>
              <span class="user-role" [ngClass]="authService.userRole()?.toLowerCase()">
                {{ authService.userRole() }}
              </span>
            </div>
            <button (click)="logout()" class="btn-logout" title="Sign out">
              <span>Sign out</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>
    }
  `,
  styles: [`
    .app-nav {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      color: #f8fafc;
      position: sticky;
      top: 0;
      z-index: 50;
      height: 60px;
    }
    .nav-container {
      width: 100%;
      padding: 0 1.5rem;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 1.15rem;
    }
    .brand-icon {
      font-size: 1.4rem;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .badge-arch {
      font-size: 0.7rem;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .nav-user {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .user-role {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .user-role.admin { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .user-role.doctor { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .user-role.pharmacist { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .user-role.laboratorian { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .user-role.cashier { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    .user-role.staff { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #334155;
      color: #cbd5e1;
      border: none;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-logout:hover {
      background: #ef4444;
      color: #ffffff;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthServicePort);

  logout(): void {
    this.authService.logout();
  }
}
