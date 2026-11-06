import { hidden, schema, validate } from '@angular/forms/signals';
import { checkHostname } from '@datapoint/apiary-ui';
import { DnsProviderView } from '../api/models';
import { isWildcard, nameLines, providersFor } from '../dns-providers/dns-names';

export const maximumNames = 10;

export type RequestChallenge = 'dns' | 'http';

export interface RequestModel {
  names: string;
  challenge: RequestChallenge;
  dnsProviderId: string;
  projectId: string;
}

export function nameError(name: string): string | null {
  const base = isWildcard(name) ? name.slice(2) : name;
  if (base.includes('*')) {
    return 'certificate.nameInvalid';
  }
  return checkHostname(base);
}

function namesError(value: string): string | null {
  const names = nameLines(value);
  if (names.length === 0) {
    return 'required';
  }
  if (names.length > maximumNames) {
    return 'certificate.namesTooMany';
  }
  return names.map(nameError).find((code) => code !== null) ?? null;
}

function providerError(value: string, names: string[], providers: readonly DnsProviderView[], canAdminister: boolean): string | null {
  if (names.length === 0 || names.some((name) => nameError(name) !== null)) {
    return null;
  }
  if (providersFor(providers, names).length === 0) {
    return canAdminister ? 'certificate.noProvider' : 'certificate.noProviderAsk';
  }
  return value ? null : 'certificate.chooseProvider';
}

export const requestRules = (providers: () => readonly DnsProviderView[], canAdminister: () => boolean) =>
  schema<RequestModel>((request) => {
    validate(request.names, ({ value }) => {
      const kind = namesError(value());
      return kind ? { kind, params: { max: maximumNames } } : undefined;
    });
    validate(request.challenge, ({ value, valueOf }) =>
      value() === 'http' && nameLines(valueOf(request.names)).some(isWildcard) ? { kind: 'certificate.wildcardNeedsDns' } : undefined,
    );
    hidden(request.dnsProviderId, ({ valueOf }) => valueOf(request.challenge) !== 'dns');
    validate(request.dnsProviderId, ({ value, valueOf }) => {
      const kind = providerError(value(), nameLines(valueOf(request.names)), providers(), canAdminister());
      return kind ? { kind } : undefined;
    });
  });
