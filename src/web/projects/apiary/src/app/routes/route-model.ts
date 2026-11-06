import { formatUtc, parseUtc } from '@datapoint/apiary-ui';
import { MaintenanceWindow, RoutePasswordView, RouteView } from '../api/models';
import { passphrase } from './passphrase';
import { RequestSizeLimit, RequestSizeModel, sizeModel } from './request-size';

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

export interface PasswordModel {
  enabled: boolean;
  replace: boolean;
  newPassword: string;
  days: string;
  message: string;
  link: boolean;
  newLink: boolean;
}

export interface RouteModel {
  projectId: string;
  host: string;
  path: string;
  targets: RouteTargetModel[];
  timeoutSeconds: number | null;
  certificate: 'automatic' | 'uploaded';
  certificateId: string;
  challenge: string;
  allowedAddresses: string;
  rateLimited: boolean;
  rateLimit: number | null;
  requestSize: RequestSizeLimit;
  requestCustom: RequestSizeModel;
  maintenance: MaintenanceModel;
  canary: CanaryModel;
  sticky: boolean;
  compression: boolean;
  caching: boolean;
  strictTransport: boolean;
  strictTransportSubdomains: boolean;
  password: PasswordModel;
}

function noCanary(): CanaryModel {
  return { source: 'none', name: 'X-Canary', value: 'true' };
}

function passwordModel(current: RoutePasswordView | undefined): PasswordModel {
  if (!current) {
    return { enabled: false, replace: true, newPassword: passphrase(), days: '7', message: '', link: true, newLink: false };
  }
  return { enabled: true, replace: false, newPassword: '', days: String(current.days), message: current.message ?? '', link: !!current.linkMadeAt, newLink: false };
}

function noMaintenance(): MaintenanceModel {
  return { scheduled: false, start: '', end: '', message: '' };
}

export function emptyRoute(projectId: string, defaultMegabytes = 30): RouteModel {
  return { projectId, host: '', path: '/', targets: [{ host: '', port: 8080, weight: 100 }], timeoutSeconds: 30, certificate: 'automatic', certificateId: '', challenge: 'http-01', allowedAddresses: '', rateLimited: false, rateLimit: 600, requestSize: 'default', requestCustom: sizeModel(defaultMegabytes), maintenance: noMaintenance(), canary: noCanary(), sticky: false, compression: false, caching: false, strictTransport: false, strictTransportSubdomains: false, password: passwordModel(undefined) };
}

export function routeModel(route: RouteView, defaultMegabytes = 30): RouteModel {
  return {
    projectId: route.projectId,
    host: route.host,
    path: route.path,
    targets: route.targets.map((t) => ({ ...t })),
    timeoutSeconds: route.timeoutSeconds,
    certificate: route.certificateId ? 'uploaded' : 'automatic',
    certificateId: route.certificateId ?? '',
    challenge: 'http-01',
    allowedAddresses: route.allowedAddresses.join('\n'),
    rateLimited: route.rateLimit !== undefined,
    rateLimit: route.rateLimit ?? 600,
    requestSize: route.requestSize,
    requestCustom: sizeModel(route.requestMegabytes ?? defaultMegabytes),
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
    password: passwordModel(route.password),
  };
}

export function maintenanceWindow(maintenance: MaintenanceModel): MaintenanceWindow | null {
  if (!maintenance.scheduled) {
    return null;
  }
  return {
    start: new Date(parseUtc(maintenance.start) ?? 0).toISOString(),
    end: new Date(parseUtc(maintenance.end) ?? 0).toISOString(),
    message: maintenance.message.trim() || undefined,
  };
}
