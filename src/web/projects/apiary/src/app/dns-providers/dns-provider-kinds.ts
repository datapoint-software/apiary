import { DnsProviderKind } from '../api/models';

export interface DnsProviderKindInfo {
  readonly kind: DnsProviderKind;
  readonly label: string;
  readonly short: string;
}

export const dnsProviderKinds: readonly DnsProviderKindInfo[] = [
  { kind: 'rfc2136', label: 'Own DNS server (RFC 2136)', short: 'RFC 2136' },
  { kind: 'hetzner', label: 'Hetzner DNS', short: 'Hetzner' },
  { kind: 'cloudflare', label: 'Cloudflare', short: 'Cloudflare' },
  { kind: 'azure', label: 'Azure DNS', short: 'Azure DNS' },
  { kind: 'route53', label: 'Amazon Route 53', short: 'Route 53' },
];

export function shortKind(kind: DnsProviderKind): string {
  return dnsProviderKinds.find((info) => info.kind === kind)?.short ?? kind;
}

export type SecretKey = 'secret' | 'token' | 'clientSecret' | 'secretKey';

export const secretOf: Readonly<Record<DnsProviderKind, SecretKey>> = {
  rfc2136: 'secret',
  hetzner: 'token',
  cloudflare: 'token',
  azure: 'clientSecret',
  route53: 'secretKey',
};

export type TextSettingKey = 'server' | 'keyName' | 'tenant' | 'clientId' | 'subscription' | 'resourceGroup' | 'accessKey';

export const textSettingsOf: Readonly<Record<DnsProviderKind, readonly TextSettingKey[]>> = {
  rfc2136: ['server', 'keyName'],
  hetzner: [],
  cloudflare: [],
  azure: ['tenant', 'clientId', 'subscription', 'resourceGroup'],
  route53: ['accessKey'],
};
