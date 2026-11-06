import { DnsProviderView } from '../api/models';

export const httpChallenge = 'http-01';

export interface ChallengeRecord {
  readonly name: string;
  readonly target: string;
}

export function bareName(name: string): string {
  return name.startsWith('*.') ? name.slice(2) : name;
}

export function isWildcard(name: string): boolean {
  return name.startsWith('*.');
}

export function nameLines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function isUnder(name: string, domain: string): boolean {
  const bare = bareName(name.toLowerCase());
  return bare === domain || bare.endsWith(`.${domain}`);
}

export function providerCovers(provider: DnsProviderView, name: string): boolean {
  return provider.domains.some((domain) => isUnder(name, domain));
}

export function providersFor(providers: readonly DnsProviderView[], names: readonly string[]): DnsProviderView[] {
  return names.length === 0 ? [] : providers.filter((provider) => names.every((name) => providerCovers(provider, name)));
}

function narrowestMatch(provider: DnsProviderView, names: readonly string[]): number {
  const lengths = names.map((name) => Math.max(...provider.domains.filter((domain) => isUnder(name, domain)).map((domain) => domain.length)));
  return Math.min(...lengths);
}

export function bestProvider(providers: readonly DnsProviderView[], names: readonly string[]): DnsProviderView | undefined {
  return providersFor(providers, names).sort((a, b) => narrowestMatch(b, names) - narrowestMatch(a, names))[0];
}

export function challengeName(name: string): string {
  return `_acme-challenge.${bareName(name)}`;
}

export function challengeRecords(provider: DnsProviderView | undefined, names: readonly string[]): ChallengeRecord[] {
  const zone = provider?.challengeZone;
  if (!zone) {
    return [];
  }
  const hosts = [...new Set(names.map(bareName))];
  return hosts.map((host) => ({ name: challengeName(host), target: `${host}.${zone}` }));
}

export function covers(pattern: string, host: string): boolean {
  const name = pattern.toLowerCase();
  const hostname = host.toLowerCase();
  if (name === hostname) {
    return true;
  }
  return isWildcard(name) && hostname.endsWith(name.slice(1)) && hostname.split('.').length === name.split('.').length;
}

export function testRecord(provider: DnsProviderView): string {
  return `_apiary-test.${provider.challengeZone ?? provider.domains[0]}`;
}

export function isFailing(provider: DnsProviderView): boolean {
  return provider.lastTest?.succeeded === false;
}
