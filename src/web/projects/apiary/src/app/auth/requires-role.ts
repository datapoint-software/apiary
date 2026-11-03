import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../api/models';
import { Auth } from './auth';

export function requiresRole(role: Role): CanActivateFn {
  return () => inject(Auth).has(role) || inject(Router).createUrlTree(['/']);
}
