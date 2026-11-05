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
    path: 'connect',
    title: 'Connect an agent · Apiary',
    canActivate: [signedIn],
    loadComponent: () => import('./agents/connect-agent').then((m) => m.ConnectAgent),
  },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    children: [
      { path: '', title: 'Overview · Apiary', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
      { path: 'routes', title: 'All routes · Apiary', loadComponent: () => import('./routes/route-list').then((m) => m.RouteList) },
      {
        path: 'projects',
        title: 'Projects · Apiary',
        loadComponent: () => import('./projects/project-list').then((m) => m.ProjectList),
      },
      {
        path: 'projects/:id',
        title: 'Project · Apiary',
        loadComponent: () => import('./projects/project-page').then((m) => m.ProjectPage),
      },
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
      { path: 'stacks', title: 'Stacks · Apiary', loadComponent: () => import('./stacks/stack-list').then((m) => m.StackList) },
      {
        path: 'stacks/:name',
        title: 'Stack · Apiary',
        loadComponent: () => import('./stacks/stack-page').then((m) => m.StackPage),
      },
      {
        path: 'certificates',
        title: 'Certificates · Apiary',
        loadComponent: () => import('./certificates/certificate-list').then((m) => m.CertificateList),
      },
      {
        path: 'streams',
        title: 'Stream routes · Apiary',
        loadComponent: () => import('./streams/stream-list').then((m) => m.StreamList),
      },
      {
        path: 'redirects',
        title: 'Redirects · Apiary',
        loadComponent: () => import('./redirects/redirect-list').then((m) => m.RedirectList),
      },
      {
        path: 'visitor-pages',
        title: 'Visitor pages · Apiary',
        loadComponent: () => import('./visitor-pages/visitor-pages').then((m) => m.VisitorPages),
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
        path: 'pipeline-tokens',
        title: 'Pipeline tokens · Apiary',
        canActivate: [requiresRole('administrator')],
        loadComponent: () => import('./stacks/pipeline-token-list').then((m) => m.PipelineTokenList),
      },
      {
        path: 'single-sign-on',
        title: 'Single sign-on · Apiary',
        canActivate: [requiresRole('administrator')],
        loadComponent: () => import('./sso/sso-settings').then((m) => m.SsoSettings),
      },
      {
        path: 'backups',
        title: 'Backups · Apiary',
        canActivate: [requiresRole('administrator')],
        loadComponent: () => import('./backups/backup-page').then((m) => m.BackupPage),
      },
      {
        path: 'root-key',
        title: 'Root key · Apiary',
        canActivate: [requiresRole('administrator')],
        loadComponent: () => import('./keys/root-key-page').then((m) => m.RootKeyPage),
      },
      {
        path: 'replicas',
        title: 'Replicas · Apiary',
        loadComponent: () => import('./cluster/replica-list').then((m) => m.ReplicaList),
      },
      {
        path: 'agents',
        title: 'Connected agents · Apiary',
        loadComponent: () => import('./agents/agent-list').then((m) => m.AgentList),
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
