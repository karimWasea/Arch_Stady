// ============================================================
// Root Application Component
// Hosts MainLayoutComponent containing header, sidebar & outlet
// ============================================================

import { Component } from '@angular/core';
import { MainLayoutComponent } from './presentation/layout/main-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent],
  template: `
    <app-main-layout></app-main-layout>
  `
})
export class App {}
