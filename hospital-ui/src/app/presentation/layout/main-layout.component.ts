// ============================================================
// Presentation Layer — Main Layout Component
// ============================================================

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthServicePort } from '../../application/ports/auth.port';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    @if (authService.isAuthenticated()) {
      <div class="app-shell">
        <app-navbar></app-navbar>
        <div class="shell-body">
          <app-sidebar></app-sidebar>
          <main class="shell-content">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    } @else {
      <main class="public-shell">
        <router-outlet></router-outlet>
      </main>
    }
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #0f172a;
    }
    .shell-body {
      display: flex;
      flex: 1;
      min-height: calc(100vh - 60px);
    }
    .shell-content {
      flex: 1;
      background: #f8fafc;
      overflow-y: auto;
      min-width: 0;
      padding-bottom: 3rem;
    }
    .public-shell {
      min-height: 100vh;
      background: #0f172a;
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthServicePort);
}
