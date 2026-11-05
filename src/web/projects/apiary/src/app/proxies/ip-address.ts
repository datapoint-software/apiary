export interface IpAddress {
  readonly length: 32 | 128;
  readonly bits: bigint;
}

export interface IpNetwork extends IpAddress {
  readonly prefix: number;
  readonly isSingleAddress: boolean;
}

export interface ForwardedAddress {
  readonly entry: string;
  readonly address: IpAddress;
  readonly text: string;
}

const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const ipv6Group = /^[0-9a-f]{1,4}$/i;
const bracketedPattern = /^\[([^\]]+)\](?::(\d{1,5}))?$/;
const ipv4WithPortPattern = /^([\d.]+):(\d{1,5})$/;
const mappedPrefix = 0xffffn;

function parseIpv4(text: string): bigint | null {
  const match = ipv4Pattern.exec(text);
  if (!match) {
    return null;
  }
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) {
    return null;
  }
  return octets.reduce((bits, octet) => (bits << 8n) + BigInt(octet), 0n);
}

function withIpv4AsGroups(text: string): string | null {
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (!tail.includes('.')) {
    return text;
  }
  const ipv4 = parseIpv4(tail);
  if (ipv4 === null) {
    return null;
  }
  return `${text.slice(0, lastColon + 1)}${(ipv4 >> 16n).toString(16)}:${(ipv4 & 0xffffn).toString(16)}`;
}

function ipv6Groups(text: string): string[] | null {
  const halves = text.split('::');
  if (halves.length > 2) {
    return null;
  }
  const [head, tail] = halves.map((half) => (half ? half.split(':') : []));
  if (tail === undefined) {
    return head;
  }
  const missing = 8 - head.length - tail.length;
  return missing < 1 ? null : [...head, ...Array<string>(missing).fill('0'), ...tail];
}

function parseIpv6(text: string): bigint | null {
  if (!text.includes(':')) {
    return null;
  }
  const expanded = withIpv4AsGroups(text);
  const groups = expanded === null ? null : ipv6Groups(expanded);
  if (groups?.length !== 8 || !groups.every((group) => ipv6Group.test(group))) {
    return null;
  }
  return groups.reduce((bits, group) => (bits << 16n) + BigInt(`0x${group}`), 0n);
}

export function parseIp(text: string): IpAddress | null {
  const value = text.trim();
  const ipv4 = parseIpv4(value);
  if (ipv4 !== null) {
    return { length: 32, bits: ipv4 };
  }
  const ipv6 = parseIpv6(value);
  return ipv6 === null ? null : { length: 128, bits: ipv6 };
}

export function isMappedIpv4(address: IpAddress): boolean {
  return address.length === 128 && address.bits >> 32n === mappedPrefix;
}

export function normalize(address: IpAddress): IpAddress {
  return isMappedIpv4(address) ? { length: 32, bits: address.bits & 0xffffffffn } : address;
}

export function formatIpv4(bits: bigint): string {
  return [24n, 16n, 8n, 0n].map((shift) => ((bits >> shift) & 0xffn).toString()).join('.');
}

function isPort(text: string | undefined): boolean {
  return text === undefined || Number(text) <= 65535;
}

function withoutPort(entry: string): string | null {
  const bracketed = bracketedPattern.exec(entry);
  if (bracketed) {
    return isPort(bracketed[2]) ? bracketed[1] : null;
  }
  const ipv4WithPort = ipv4WithPortPattern.exec(entry);
  if (ipv4WithPort) {
    return isPort(ipv4WithPort[2]) ? ipv4WithPort[1] : null;
  }
  return entry;
}

export function parseForwardedAddress(entry: string): ForwardedAddress | null {
  const trimmed = entry.trim();
  const text = withoutPort(trimmed);
  const parsed = text === null ? null : parseIp(text);
  if (text === null || parsed === null) {
    return null;
  }
  const address = normalize(parsed);
  return { entry: trimmed, address, text: isMappedIpv4(parsed) ? formatIpv4(address.bits) : text };
}

export function parseRange(text: string): IpNetwork | null {
  const parts = text.trim().split('/');
  const address = parts.length > 2 ? null : parseIp(parts[0]);
  if (address === null) {
    return null;
  }
  const prefixText = parts[1];
  if (prefixText === undefined) {
    return { ...address, prefix: address.length, isSingleAddress: true };
  }
  const prefix = /^\d{1,3}$/.test(prefixText) ? Number(prefixText) : -1;
  return prefix < 0 || prefix > address.length ? null : { ...address, prefix, isSingleAddress: false };
}

export function contains(network: IpNetwork, address: IpAddress): boolean {
  const hostBits = BigInt(network.length - network.prefix);
  return network.length === address.length && network.bits >> hostBits === address.bits >> hostBits;
}

export function isSameRange(first: IpNetwork, second: IpNetwork): boolean {
  return (
    first.length === second.length &&
    first.prefix === second.prefix &&
    first.isSingleAddress === second.isSingleAddress &&
    first.bits === second.bits
  );
}

const privateRanges = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '100.64.0.0/10',
  '169.254.0.0/16',
  'fc00::/7',
  '::1/128',
  'fe80::/10',
].map((range) => parseRange(range) as IpNetwork);

export function isPublicRange(network: IpNetwork): boolean {
  return !privateRanges.some((p) => network.prefix >= p.prefix && contains(p, network));
}
