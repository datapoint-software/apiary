import { Routes } from '@angular/router';
import { Shell } from './shell/shell';
import { unsavedChanges } from './shell/unsaved-changes';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', title: 'Overview · Apiary', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
      { path: 'routes', title: 'All routes · Apiary', loadComponent: () => import('./routes/route-list').then((m) => m.RouteList) },
      {
        path: 'routes/new',
        title: 'New route · Apiary',
        loadComponent: () => import('./routes/route-editor').then((m) => m.RouteEditor),
        canDeactivate: [unsavedChanges],
      },
      {
        path: 'routes/:id',
        title: 'Route · Apiary',
        loadComponent: () => import('./routes/route-editor').then((m) => m.RouteEditor),
        canDeactivate: [unsavedChanges],
      },
      { path: '**', title: 'Not found · Apiary', loadComponent: () => import('./shell/not-found').then((m) => m.NotFound) },
    ],
  },
];
