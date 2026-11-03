import { formatUtc } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

export interface RouteTargetModel {
  host: string;
  port: number | null;
  weight: number | null;
}

export interface CanaryModel {
  source: 'none' | 'header' | 'cookie';
  name: string;
  value: string;
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
  canary: CanaryModel;
  sticky: boolean;
  compression: boolean;
  caching: boolean;
  strictTransport: boolean;
  strictTransportSubdomains: boolean;
}

function noCanary(): CanaryModel {
  return { source: 'none', name: 'X-Canary', value: 'true' };
}

function noMaintenance(): MaintenanceModel {
  return { scheduled: false, start: '', end: '', message: '' };
}

export function emptyRoute(projectId: string): RouteModel {
  return { projectId, host: '', path: '/', targets: [{ host: '', port: 8080, weight: 100 }], timeoutSeconds: 30, certificate: 'automatic', certificateId: '', allowedAddresses: '', maintenance: noMaintenance(), canary: noCanary(), sticky: false, compression: false, caching: false, strictTransport: false, strictTransportSubdomains: false };
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
    canary: route.canary ? { ...route.canary } : noCanary(),
    sticky: route.sticky,
    compression: route.compression,
    caching: route.caching,
    strictTransport: route.strictTransport,
    strictTransportSubdomains: route.strictTransportSubdomains,
  };
}
