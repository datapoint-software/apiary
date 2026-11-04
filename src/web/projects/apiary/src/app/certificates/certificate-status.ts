import { I18n, Tone } from '@datapoint/apiary-ui';
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

export function statusText(certificate: CertificateSummary, i18n: I18n): string {
  const days = daysLeft(certificate);
  switch (certificate.status) {
    case 'pending':
      return i18n.t('Requesting from Let’s Encrypt');
    case 'failing':
      return certificate.notAfter ? i18n.plural(days, 'Renewal failing, {count} day left', 'Renewal failing, {count} days left') : i18n.t('Not issued yet');
    case 'expiring':
      return i18n.plural(days, 'Expires soon, {count} day left', 'Expires soon, {count} days left');
    case 'expired':
      return i18n.t('Expired');
    default:
      return i18n.plural(days, '{count} day left', '{count} days left');
  }
}

export function sourceName(certificate: CertificateSummary): string {
  return certificate.source === 'automatic' ? 'Automatic' : 'Uploaded';
}

export function needsAttention(certificate: CertificateSummary): boolean {
  return certificate.status !== 'ok' && certificate.status !== 'pending';
}
