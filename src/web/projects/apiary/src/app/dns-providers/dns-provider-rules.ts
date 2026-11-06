import { SchemaPath, hidden, schema, validate } from '@angular/forms/signals';
import { checkHostname, port } from '@datapoint/apiary-ui';
import { DnsProviderDetails, DnsProviderKind, DnsProviderView } from '../api/models';
import { nameLines } from './dns-names';
import { SecretKey, TextSettingKey, secretOf, textSettingsOf } from './dns-provider-kinds';

export const maximumName = 60;
export const maximumDomains = 20;
export const maximumSetting = 200;

export type ChallengeWhere = 'delegate' | 'direct';

export interface DnsProviderModel {
  name: string;
  kind: DnsProviderKind;
  domains: string;
  where: ChallengeWhere;
  challengeZone: string;
  server: string;
  port: number | null;
  keyName: string;
  algorithm: string;
  secret: string;
  token: string;
  tenant: string;
  clientId: string;
  clientSecret: string;
  subscription: string;
  resourceGroup: string;
  accessKey: string;
  secretKey: string;
}

export function dnsProviderModel(details: DnsProviderDetails | null): DnsProviderModel {
  const setting = (key: string, fallback = '') => details?.settings[key] ?? fallback;
  return {
    ...identityOf(details?.provider),
    server: setting('server'),
    port: Number(setting('port', '53')),
    keyName: setting('keyName'),
    algorithm: setting('algorithm', 'hmac-sha256'),
    secret: '',
    token: '',
    tenant: setting('tenant'),
    clientId: setting('clientId'),
    clientSecret: '',
    subscription: setting('subscription'),
    resourceGroup: setting('resourceGroup'),
    accessKey: setting('accessKey'),
    secretKey: '',
  };
}

function identityOf(provider: DnsProviderView | undefined): Pick<DnsProviderModel, 'name' | 'kind' | 'domains' | 'where' | 'challengeZone'> {
  if (!provider) {
    return { name: '', kind: 'rfc2136', domains: '', where: 'delegate', challengeZone: '' };
  }
  return {
    name: provider.name,
    kind: provider.kind,
    domains: provider.domains.join('\n'),
    where: provider.challengeZone ? 'delegate' : 'direct',
    challengeZone: provider.challengeZone ?? '',
  };
}

function nameError(value: string, others: readonly DnsProviderView[]): string | null {
  const name = value.trim();
  if (!name) {
    return 'required';
  }
  if (name.length > maximumName) {
    return 'tooLong';
  }
  return others.some((other) => other.name.toLowerCase() === name.toLowerCase()) ? 'dnsProvider.nameTaken' : null;
}

function domainsError(value: string, others: readonly DnsProviderView[]): string | null {
  const domains = nameLines(value);
  if (domains.length === 0) {
    return 'required';
  }
  if (domains.length > maximumDomains) {
    return 'dnsProvider.domainsTooMany';
  }
  const invalid = domains.find((domain) => checkHostname(domain) !== null);
  if (invalid) {
    return checkHostname(invalid) ?? 'hostname.invalid';
  }
  const taken = others.some((other) => other.domains.some((domain) => domains.includes(domain)));
  return taken ? 'dnsProvider.domainTaken' : null;
}

function zoneError(value: string, domains: string): string | null {
  const zone = value.trim().toLowerCase();
  const invalid = checkHostname(zone);
  if (invalid) {
    return invalid;
  }
  return nameLines(domains).includes(zone) ? 'dnsProvider.challengeZoneOverlaps' : null;
}

function asError(kind: string | null, params?: Record<string, unknown>) {
  return kind ? { kind, params } : undefined;
}

function textSetting(path: SchemaPath<string>, key: TextSettingKey, kind: SchemaPath<DnsProviderKind>): void {
  hidden(path, ({ valueOf }) => !textSettingsOf[valueOf(kind)].includes(key));
  validate(path, ({ value }) => {
    const text = value().trim();
    if (!text) {
      return { kind: 'required' };
    }
    return text.length > maximumSetting ? { kind: 'tooLong', params: { max: maximumSetting } } : undefined;
  });
}

const isBase64 = (text: string) => /^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0;

export const dnsProviderRules = (others: () => readonly DnsProviderView[], keeps: (kind: DnsProviderKind, key: SecretKey) => boolean) =>
  schema<DnsProviderModel>((provider) => {
    validate(provider.name, ({ value }) => asError(nameError(value(), others()), { max: maximumName }));
    validate(provider.domains, ({ value }) => asError(domainsError(value(), others())));
    hidden(provider.challengeZone, ({ valueOf }) => valueOf(provider.where) !== 'delegate');
    validate(provider.challengeZone, ({ value, valueOf }) => asError(zoneError(value(), valueOf(provider.domains))));
    const settings: Record<TextSettingKey, SchemaPath<string>> = {
      server: provider.server,
      keyName: provider.keyName,
      tenant: provider.tenant,
      clientId: provider.clientId,
      subscription: provider.subscription,
      resourceGroup: provider.resourceGroup,
      accessKey: provider.accessKey,
    };
    for (const [key, path] of Object.entries(settings) as [TextSettingKey, SchemaPath<string>][]) {
      textSetting(path, key, provider.kind);
    }
    hidden(provider.port, ({ valueOf }) => valueOf(provider.kind) !== 'rfc2136');
    port(provider.port);
    hidden(provider.algorithm, ({ valueOf }) => valueOf(provider.kind) !== 'rfc2136');
    const secrets: Record<SecretKey, SchemaPath<string>> = {
      secret: provider.secret,
      token: provider.token,
      clientSecret: provider.clientSecret,
      secretKey: provider.secretKey,
    };
    for (const [key, path] of Object.entries(secrets) as [SecretKey, SchemaPath<string>][]) {
      hidden(path, ({ valueOf }) => secretOf[valueOf(provider.kind)] !== key);
      validate(path, ({ value, valueOf }) => (value().trim() || keeps(valueOf(provider.kind), key) ? undefined : { kind: 'required' }));
    }
    validate(provider.secret, ({ value }) => {
      const text = value().trim();
      return !text || isBase64(text) ? undefined : { kind: 'dnsProvider.secretInvalid' };
    });
  });
