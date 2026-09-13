// ============================================================
// Infrastructure Layer — Auth Interceptor
// Injects JWT Bearer token & catches 401 errors
// ============================================================

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthServicePort } from '../../application/ports/auth.port';
import { AuthAdapter } from '../adapters/auth.adapter';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // We need the concrete adapter here to access getStoredToken()
  // The interceptor runs outside the DI-injected port context
  const authAdapter = inject(AuthServicePort) as AuthAdapter;
  const token = authAdapter.getStoredToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authAdapter.logout();
      }
      return throwError(() => error);
    })
  );
};
