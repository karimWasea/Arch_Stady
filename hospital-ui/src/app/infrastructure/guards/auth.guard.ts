// ============================================================
// Infrastructure Layer — Auth Guard
// Functional CanActivateFn checking AuthServicePort.isAuthenticated()
// ============================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServicePort } from '../../application/ports/auth.port';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthServicePort);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store return URL for redirect after login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
