const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const ipv6 = /^\[?[0-9a-f:]+\]?$/i;
const name = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i;

function ipv4Kind(host: string): string | null | undefined {
  const match = ipv4.exec(host);
  if (!match) {
    return undefined;
  }
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 127) {
    return 'target.loopback';
  }
  if ((a === 169 && b === 254) || host === '100.100.100.200') {
    return 'target.linkLocal';
  }
  return host === '0.0.0.0' ? 'target.unspecified' : null;
}

function ipv6Kind(host: string): string | null {
  const bare = host.replace(/^\[|\]$/g, '');
  if (bare === '::1') {
    return 'target.loopback';
  }
  if (/^fe80:/i.test(bare) || /^fd00:ec2::254$/i.test(bare)) {
    return 'target.linkLocal';
  }
  return bare === '::' ? 'target.unspecified' : null;
}

function addressKind(host: string): string | null {
  const kind = ipv4Kind(host);
  return kind === undefined ? ipv6Kind(host) : kind;
}

export function checkTarget(value: string): string | null {
  const host = value.trim().toLowerCase();
  if (!host) {
    return 'target.required';
  }
  if (/:\d+$/.test(host) && !ipv6.test(host)) {
    return 'target.port';
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return 'target.loopback';
  }
  const kind = addressKind(host);
  if (kind) {
    return kind;
  }
  return name.test(host) || ipv6.test(host) ? null : 'target.invalid';
}
