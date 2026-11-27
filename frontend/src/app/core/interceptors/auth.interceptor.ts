import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { expired: '1' } });
      } else if (
        err.status >= 500
        && router.url !== '/server-error'
        && !(req.url.includes('/api/v1/cart') && req.method !== 'GET')
      ) {
        router.navigate(['/server-error'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    })
  );
};
