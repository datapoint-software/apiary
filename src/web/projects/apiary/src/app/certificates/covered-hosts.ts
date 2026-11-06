import { CertificateSummary, RouteView } from '../api/models';
import { covers } from '../dns-providers/dns-names';

export interface CoveredHost {
  readonly host: string;
  readonly routeCount: number;
  readonly currentName?: string;
}

export function coveredHosts(certificate: CertificateSummary, routes: readonly RouteView[], certificates: readonly CertificateSummary[]): CoveredHost[] {
  const others = routes.filter((route) => route.certificateId !== certificate.id && certificate.hosts.some((name) => covers(name, route.host)));
  const hosts = [...new Set(others.map((route) => route.host))];
  return hosts.map((host) => {
    const onHost = others.filter((route) => route.host === host);
    const currentId = onHost[0].certificateId;
    return { host, routeCount: onHost.length, currentName: certificates.find((c) => c.id === currentId)?.name };
  });
}
