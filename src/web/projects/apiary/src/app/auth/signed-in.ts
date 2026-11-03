import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from '../api/api';
import { SetupStatus } from '../api/models';
import { Auth } from './auth';

export const signedIn: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const api = inject(Api);
  if (auth.user() || (await auth.load())) {
    return true;
  }
  const setup = await api.read<SetupStatus>('setup.status');
  if (setup.open) {
    return router.createUrlTree(['/setup']);
  }
  return router.createUrlTree(['/sign-in'], { queryParams: state.url === '/' ? {} : { next: state.url } });
};
