import { RouteView } from '../api/models';

export interface RouteTargetModel {
  host: string;
  port: number | null;
  weight: number;
}

export interface RouteModel {
  projectId: string;
  host: string;
  path: string;
  targets: RouteTargetModel[];
  timeoutSeconds: number | null;
  certificate: 'automatic' | 'uploaded';
  certificateId: string;
}

export function emptyRoute(projectId: string): RouteModel {
  return { projectId, host: '', path: '/', targets: [{ host: '', port: 8080, weight: 100 }], timeoutSeconds: 30, certificate: 'automatic', certificateId: '' };
}

export function routeModel(route: RouteView): RouteModel {
  return {
    projectId: route.projectId,
    host: route.host,
    path: route.path,
    targets: route.targets.map((t) => ({ ...t })),
    timeoutSeconds: route.timeoutSeconds,
    certificate: route.certificateId ? 'uploaded' : 'automatic',
    certificateId: route.certificateId ?? '',
  };
}
