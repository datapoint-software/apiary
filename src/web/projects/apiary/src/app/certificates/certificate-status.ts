import { Tone } from '@datapoint/apiary-ui';
import { CertificateStatus, CertificateSummary } from '../api/models';

const day = 86_400_000;

const tones: Record<CertificateStatus, Tone> = {
  ok: 'ok',
  pending: 'info',
  failing: 'warn',
  expiring: 'warn',
  expired: 'critical',
};

export function daysLeft(certificate: CertificateSummary, now = Date.now()): number {
  return certificate.notAfter ? Math.max(0, Math.round((Date.parse(certificate.notAfter) - now) / day)) : 0;
}

export function statusTone(certificate: CertificateSummary): Tone {
  return certificate.status === 'failing' && !certificate.notAfter ? 'critical' : tones[certificate.status];
}

export function statusText(certificate: CertificateSummary): string {
  const days = daysLeft(certificate);
  const left = days === 1 ? '1 day left' : `${days} days left`;
  switch (certificate.status) {
    case 'pending':
      return 'Requesting from Let’s Encrypt';
    case 'failing':
      return certificate.notAfter ? `Renewal failing, ${left}` : 'Not issued yet';
    case 'expiring':
      return `Expires soon, ${left}`;
    case 'expired':
      return 'Expired';
    default:
      return left;
  }
}

export function sourceName(certificate: CertificateSummary): string {
  return certificate.source === 'automatic' ? 'Automatic' : 'Uploaded';
}

export function needsAttention(certificate: CertificateSummary): boolean {
  return certificate.status !== 'ok' && certificate.status !== 'pending';
}
