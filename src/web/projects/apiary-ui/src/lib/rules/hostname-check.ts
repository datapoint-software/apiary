const maximumLength = 253;
const label = /^[a-z0-9-]{0,63}$/i;

function labelsAreValid(hostname: string): boolean {
  return hostname.split('.').every((part) => label.test(part) && !part.startsWith('-') && !part.endsWith('-'));
}

export function checkHostname(value: string): string | null {
  const hostname = value.trim();
  if (!hostname) {
    return 'hostname.required';
  }
  if (/^https?:\/\//i.test(hostname)) {
    return 'hostname.scheme';
  }
  if (/[/:]/.test(hostname)) {
    return 'hostname.path';
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return 'hostname.address';
  }
  if (hostname.length > maximumLength) {
    return 'hostname.tooLong';
  }
  if (!hostname.includes('.')) {
    return 'hostname.notFull';
  }
  if (hostname.split('.').some((part) => part === '')) {
    return 'hostname.consecutiveDots';
  }
  return labelsAreValid(hostname) ? null : 'hostname.label';
}
