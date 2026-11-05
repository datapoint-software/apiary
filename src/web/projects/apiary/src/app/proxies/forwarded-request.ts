import { ForwardedAddress, IpAddress, IpNetwork, contains, formatIpv4, isMappedIpv4, normalize, parseForwardedAddress, parseIp, parseRange } from './ip-address';

export const maximumForwardedAddresses = 20;

export type ForwardedReason = 'untrusted' | 'untrustedWithHeaders' | 'tooManyAddresses' | 'notAnAddress' | 'noForwardedFor' | 'trustedChain';

export type Scheme = 'http' | 'https';

export interface ForwardedHeaders {
  readonly connection: string;
  readonly forwardedFor: string;
  readonly forwardedProto: string;
}

export interface ForwardedRequest {
  readonly client: string;
  readonly scheme: Scheme;
  readonly sentFor: string;
  readonly reason: ForwardedReason;
  readonly skipped: number;
  readonly ignoredProto: boolean;
}

type Trust = (address: IpAddress) => boolean;

interface Connection {
  readonly address: IpAddress;
  readonly text: string;
}

function split(header: string): string[] {
  return header
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseConnection(text: string): Connection | null {
  const parsed = parseIp(text);
  if (parsed === null) {
    return null;
  }
  const address = normalize(parsed);
  return { address, text: isMappedIpv4(parsed) ? formatIpv4(address.bits) : text.trim() };
}

function protoAt(protos: readonly string[], hop: number): string | undefined {
  return protos.length === 1 ? protos[0] : protos[protos.length - 1 - hop];
}

function schemeOf(proto: string | undefined): Scheme | null {
  const lower = proto?.toLowerCase();
  return lower === 'http' || lower === 'https' ? lower : null;
}

function ownAddress(connection: Connection, reason: ForwardedReason): ForwardedRequest {
  return { client: connection.text, scheme: 'http', sentFor: connection.text, reason, skipped: 0, ignoredProto: false };
}

function parseAll(entries: readonly string[]): ForwardedAddress[] | null {
  const addresses: ForwardedAddress[] = [];
  for (const entry of entries) {
    const parsed = parseForwardedAddress(entry);
    if (parsed === null) {
      return null;
    }
    addresses.push(parsed);
  }
  return addresses;
}

function clientIndex(addresses: readonly ForwardedAddress[], trusts: Trust): number {
  let index = addresses.length - 1;
  while (index > 0 && trusts(addresses[index].address)) {
    index--;
  }
  return index;
}

function trustedChain(connection: Connection, addresses: readonly ForwardedAddress[], protos: readonly string[], trusts: Trust): ForwardedRequest {
  const index = clientIndex(addresses, trusts);
  const hop = addresses.length - 1 - index;
  const proto = protoAt(protos, hop);
  const scheme = schemeOf(proto);
  return {
    client: addresses[index].text,
    scheme: scheme ?? 'http',
    sentFor: [...addresses.map((a) => a.entry), connection.text].join(', '),
    reason: 'trustedChain',
    skipped: hop,
    ignoredProto: proto !== undefined && scheme === null,
  };
}

function noForwardedFor(connection: Connection, protos: readonly string[]): ForwardedRequest {
  const proto = protoAt(protos, 0);
  const scheme = schemeOf(proto);
  return {
    ...ownAddress(connection, 'noForwardedFor'),
    scheme: scheme ?? 'http',
    ignoredProto: proto !== undefined && scheme === null,
  };
}

function fromTrustedProxy(connection: Connection, headers: ForwardedHeaders, trusts: Trust): ForwardedRequest {
  const entries = split(headers.forwardedFor);
  const protos = split(headers.forwardedProto);
  if (entries.length > maximumForwardedAddresses) {
    return ownAddress(connection, 'tooManyAddresses');
  }
  const addresses = parseAll(entries);
  if (addresses === null) {
    return ownAddress(connection, 'notAnAddress');
  }
  return addresses.length === 0 ? noForwardedFor(connection, protos) : trustedChain(connection, addresses, protos, trusts);
}

export function resolveRequest(headers: ForwardedHeaders, trustedRanges: readonly string[]): ForwardedRequest | null {
  const connection = parseConnection(headers.connection);
  if (connection === null) {
    return null;
  }
  const networks = trustedRanges.map(parseRange).filter((network): network is IpNetwork => network !== null);
  const trusts: Trust = (address) => networks.some((network) => contains(network, address));
  if (trusts(connection.address)) {
    return fromTrustedProxy(connection, headers, trusts);
  }
  const hasHeaders = split(headers.forwardedFor).length > 0 || split(headers.forwardedProto).length > 0;
  return ownAddress(connection, hasHeaders ? 'untrustedWithHeaders' : 'untrusted');
}
