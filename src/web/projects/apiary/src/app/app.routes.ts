import { Routes } from '@angular/router';
import { requiresRole } from './auth/requires-role';
import { signedIn } from './auth/signed-in';
import { Shell } from './shell/shell';
import { unsavedChanges } from './shell/unsaved-changes';

export const routes: Routes = [
  { path: 'sign-in', title: 'Sign in · Apiary', loadComponent: () => import('./auth/sign-in').then((m) => m.SignIn) },
  { path: 'setup', title: 'Welcome · Apiary', loadComponent: () => import('./auth/setup').then((m) => m.Setup) },
  { path: 'invite/:token', title: 'Join Apiary', loadComponent: () => import('./auth/accept-invite').then((m) => m.AcceptInvite) },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    children: [
      { path: '', title: 'Overview · Apiary', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
      { path: 'routes', title: 'All routes · Apiary', loadComponent: () => import('./routes/route-list').then((m) => m.RouteList) },
      {
        path: 'routes/new',
        title: 'New route · Apiary',
        canActivate: [requiresRole('operator')],
        loadComponent: () => import('./routes/route-editor').then((m) => m.RouteEditor),
        canDeactivate: [unsavedChanges],
      },
      {
        path: 'routes/:id',
        title: 'Route · Apiary',
        loadComponent: () => import('./routes/route-editor').then((m) => m.RouteEditor),
        canDeactivate: [unsavedChanges],
      },
      {
        path: 'certificates',
        title: 'Certificates · Apiary',
        loadComponent: () => import('./certificates/certificate-list').then((m) => m.CertificateList),
      },
      {
        path: 'certificates/:id',
        title: 'Certificate · Apiary',
        loadComponent: () => import('./certificates/certificate-details').then((m) => m.CertificateDetails),
      },
      {
        path: 'users',
        title: 'Users · Apiary',
        canActivate: [requiresRole('administrator')],
        loadComponent: () => import('./users/user-list').then((m) => m.UserList),
      },
      {
        path: 'replicas',
        title: 'Replicas · Apiary',
        loadComponent: () => import('./cluster/replica-list').then((m) => m.ReplicaList),
      },
      { path: 'audit', title: 'Audit log · Apiary', loadComponent: () => import('./audit/audit-log').then((m) => m.AuditLog) },
      { path: 'account', title: 'Your account · Apiary', loadComponent: () => import('./account/profile').then((m) => m.Profile) },
      { path: 'account/security', title: 'Security · Apiary', loadComponent: () => import('./account/security').then((m) => m.Security) },
      {
        path: 'account/sessions',
        title: 'Active sessions · Apiary',
        loadComponent: () => import('./account/sessions').then((m) => m.Sessions),
      },
      { path: '**', title: 'Not found · Apiary', loadComponent: () => import('./shell/not-found').then((m) => m.NotFound) },
    ],
  },
];
