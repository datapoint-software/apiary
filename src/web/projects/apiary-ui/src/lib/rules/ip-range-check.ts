const ipv4Range = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/;
const ipv6Range = /^([0-9a-f:]+)(?:\/(\d{1,3}))?$/i;

function isPrefixWithin(prefix: string | undefined, maximum: number): boolean {
  return prefix === undefined || Number(prefix) <= maximum;
}

function isIpv4Range(line: string): boolean | null {
  const match = ipv4Range.exec(line);
  if (!match) {
    return null;
  }
  return match.slice(1, 5).every((n) => Number(n) <= 255) && isPrefixWithin(match[5], 32);
}

function isIpv6Range(line: string): boolean {
  const match = ipv6Range.exec(line);
  if (!match) {
    return false;
  }
  const address = match[1];
  return address.includes(':') && (address.match(/::/g) ?? []).length <= 1 && isPrefixWithin(match[2], 128);
}

export function checkIpRange(value: string): string | null {
  const line = value.trim();
  const valid = isIpv4Range(line) ?? isIpv6Range(line);
  return valid ? null : 'ipRange.invalid';
}
