import { CertificateSummary } from '../api/models';
import { isRenewedWildcard } from '../certificates/certificate-status';
import { covers, httpChallenge } from '../dns-providers/dns-names';

export function savedChallenge(certificates: readonly CertificateSummary[], host: string): string {
  const name = host.trim().toLowerCase();
  const own = certificates.find((c) => c.source === 'automatic' && c.name === name);
  return own?.dnsProviderId ?? httpChallenge;
}

export function namedCertificates(certificates: readonly CertificateSummary[], host: string, chosenId: string): CertificateSummary[] {
  const hostname = host.trim();
  const coversHost = (c: CertificateSummary) => hostname !== '' && c.hosts.some((name) => covers(name, hostname));
  const isRenewedChoice = (c: CertificateSummary) => c.requested && isRenewedWildcard(c) && (coversHost(c) || c.id === chosenId);
  return certificates.filter((c) => c.source === 'uploaded' || isRenewedChoice(c));
}
