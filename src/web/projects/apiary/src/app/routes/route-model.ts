import { formatUtc } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

export interface RouteTargetModel {
  host: string;
  port: number | null;
  weight: number;
}

export interface MaintenanceModel {
  scheduled: boolean;
  start: string;
  end: string;
  message: string;
}

export interface RouteModel {
  projectId: string;
  host: string;
  path: string;
  targets: RouteTargetModel[];
  timeoutSeconds: number | null;
  certificate: 'automatic' | 'uploaded';
  certificateId: string;
  allowedAddresses: string;
  maintenance: MaintenanceModel;
}

function noMaintenance(): MaintenanceModel {
  return { scheduled: false, start: '', end: '', message: '' };
}

export function emptyRoute(projectId: string): RouteModel {
  return { projectId, host: '', path: '/', targets: [{ host: '', port: 8080, weight: 100 }], timeoutSeconds: 30, certificate: 'automatic', certificateId: '', allowedAddresses: '', maintenance: noMaintenance() };
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
    allowedAddresses: route.allowedAddresses.join('\n'),
    maintenance: route.maintenance
      ? {
          scheduled: true,
          start: formatUtc(Date.parse(route.maintenance.start)),
          end: formatUtc(Date.parse(route.maintenance.end)),
          message: route.maintenance.message ?? '',
        }
      : noMaintenance(),
  };
}
