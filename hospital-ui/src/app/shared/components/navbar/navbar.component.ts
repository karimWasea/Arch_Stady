import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
            <span class="badge-arch">Step 1: Layered</span>
          </div>

          <nav class="nav-links">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
            <a routerLink="/patients" routerLinkActive="active" class="nav-link">Patients</a>
            <a routerLink="/doctors" routerLinkActive="active" class="nav-link">Doctors</a>
            <a routerLink="/appointments" routerLinkActive="active" class="nav-link">Appointments</a>
          </nav>

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
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
      height: 64px;
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
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      gap: 0.5rem;
    }
    .nav-link {
      color: #94a3b8;
      text-decoration: none;
      padding: 0.5rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .nav-link:hover {
      color: #f8fafc;
      background: #334155;
    }
    .nav-link.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
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
    .user-role.staff { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

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
  authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
