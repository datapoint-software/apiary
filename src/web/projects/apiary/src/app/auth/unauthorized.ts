import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';

const anonymousActions = ['/api/auth/', '/api/setup/', '/api/invites/'];

export const unauthorized: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      const isSessionEnd =
        error instanceof HttpErrorResponse && error.status === 401 && !anonymousActions.some((a) => request.url.startsWith(a));
      if (isSessionEnd && auth.user()) {
        auth.user.set(null);
        void router.navigate(['/sign-in'], { queryParams: { next: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
