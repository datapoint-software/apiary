import { linkKey } from './passphrase';
import { RouteAccessData } from './route-access-dialog';
import { routeLabel } from './route-label';
import { toMegabytes } from './request-size';
import { PasswordModel, RouteModel, maintenanceWindow } from './route-model';

export interface PasswordSecrets {
  readonly newPassword: string | null;
  readonly newLinkKey: string | null;
}

export function passwordSecrets(password: PasswordModel, hasLink: boolean): PasswordSecrets {
  if (!password.enabled) {
    return { newPassword: null, newLinkKey: null };
  }
  const needsLinkKey = password.link && (password.newLink || !hasLink);
  return { newPassword: password.replace ? password.newPassword : null, newLinkKey: needsLinkKey ? linkKey() : null };
}

export function routeRequest(value: RouteModel, secrets: PasswordSecrets) {
  const many = value.targets.length > 1;
  const password = value.password;
  return {
    projectId: value.projectId,
    host: value.host.trim(),
    path: value.path.trim(),
    targets: value.targets.map((t) => ({ host: t.host.trim(), port: t.port, weight: many ? t.weight : 100 })),
    timeoutSeconds: value.timeoutSeconds,
    certificateId: value.certificate === 'uploaded' ? value.certificateId : null,
    allowedAddresses: value.allowedAddresses.split('\n').map((line) => line.trim()).filter(Boolean),
    rateLimit: value.rateLimited ? value.rateLimit : null,
    requestSize: value.requestSize,
    requestMegabytes: value.requestSize === 'custom' ? toMegabytes(value.requestCustom) : null,
    maintenance: maintenanceWindow(value.maintenance),
    canary: many && value.canary.source !== 'none'
      ? { source: value.canary.source, name: value.canary.name.trim(), value: value.canary.value.trim() }
      : null,
    sticky: many && value.sticky,
    compression: value.compression,
    caching: value.caching,
    strictTransport: value.strictTransport,
    strictTransportSubdomains: value.strictTransportSubdomains,
    password: password.enabled
      ? { ...secrets, days: Number(password.days), message: password.message.trim() || null, link: password.link }
      : null,
  };
}

export function routeAccess(host: string, path: string, secrets: PasswordSecrets, hasLink: boolean): RouteAccessData | undefined {
  if (!secrets.newPassword && !secrets.newLinkKey) {
    return undefined;
  }
  const lower = host.toLowerCase();
  return {
    label: routeLabel({ host: lower, path }),
    password: secrets.newPassword ?? undefined,
    link: secrets.newLinkKey ? `https://${lower}${path}?apiary-key=${secrets.newLinkKey}` : undefined,
    hasLink,
  };
}
