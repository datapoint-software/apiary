import { IpNetwork, contains, isPublicRange, isSameRange, parseForwardedAddress, parseIp, parseRange } from './ip-address';

function aRange(text: string): IpNetwork {
  const range = parseRange(text);
  if (range === null) {
    throw new Error(`Not a range: ${text}`);
  }
  return range;
}

function covers(range: string, address: string): boolean {
  const parsed = parseForwardedAddress(address);
  return parsed !== null && contains(aRange(range), parsed.address);
}

describe('parseIp', () => {
  it.each([
    ['203.0.113.9', 32, 0xcb007109n],
    [' 10.0.0.1 ', 32, 0x0a000001n],
    ['::', 128, 0n],
    ['::1', 128, 1n],
    ['2001:db8::1', 128, 0x20010db8000000000000000000000001n],
    ['1:2:3:4:5:6:7:8', 128, 0x00010002000300040005000600070008n],
    ['::ffff:192.0.2.1', 128, 0xffffc0000201n],
  ])('reads %s', (text, length, bits) => {
    expect(parseIp(text)).toEqual({ length, bits });
  });

  it.each(['', 'unknown', '256.0.0.1', '10.0.0', '1::2::3', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7:8::', 'fffff::1', '::ffff:300.0.0.1', '[::1]'])(
    'refuses %j',
    (text) => {
      expect(parseIp(text)).toBeNull();
    },
  );
});

describe('parseForwardedAddress', () => {
  it.each([
    ['203.0.113.9', '203.0.113.9'],
    ['203.0.113.9:51234', '203.0.113.9'],
    ['[2001:db8::1]:51234', '2001:db8::1'],
    ['[2001:db8::1]', '2001:db8::1'],
    ['2001:db8::1', '2001:db8::1'],
    ['::ffff:198.51.100.23', '198.51.100.23'],
  ])('reads the address in %s', (entry, text) => {
    expect(parseForwardedAddress(entry)?.text).toBe(text);
  });

  it('keeps the entry as it was received', () => {
    expect(parseForwardedAddress(' 203.0.113.9:51234 ')?.entry).toBe('203.0.113.9:51234');
  });

  it('turns an IPv4 address mapped into IPv6 into IPv4', () => {
    expect(parseForwardedAddress('::ffff:10.0.0.1')?.address).toEqual({ length: 32, bits: 0x0a000001n });
  });

  it.each(['unknown', '203.0.113.9:70000', '[2001:db8::1]:99999', '[unknown]', 'for=203.0.113.9'])('refuses %s', (entry) => {
    expect(parseForwardedAddress(entry)).toBeNull();
  });
});

describe('parseRange', () => {
  it('reads a range', () => {
    expect(parseRange('10.20.30.0/24')).toEqual({ length: 32, bits: 0x0a141e00n, prefix: 24, isSingleAddress: false });
  });

  it('reads a single address as a range of one', () => {
    expect(parseRange('2001:db8::1')).toMatchObject({ prefix: 128, isSingleAddress: true });
  });

  it.each(['10.0.0.0/33', '::/129', '10.0.0.0/x', '10.0.0.0/8/8', 'office/8', '10.0.0.0/'])('refuses %s', (text) => {
    expect(parseRange(text)).toBeNull();
  });
});

describe('contains', () => {
  it.each([
    ['10.20.30.0/24', '10.20.30.4', true],
    ['10.20.30.0/24', '10.20.31.4', false],
    ['10.20.30.4', '10.20.30.4', true],
    ['2400:cb00::/32', '2400:cb00:2049::1', true],
    ['2400:cb00::/32', '2400:cb01::1', false],
    ['10.0.0.0/8', '::ffff:10.1.2.3', true],
    ['10.0.0.0/8', '2001:db8::1', false],
    ['::/1', '10.0.0.1', false],
  ])('%s covers %s: %s', (range, address, covered) => {
    expect(covers(range, address)).toBe(covered);
  });
});

describe('isSameRange', () => {
  it.each([
    ['10.20.30.0/24', '10.20.30.0/24', true],
    ['2001:db8::/32', '2001:0db8:0::/32', true],
    ['10.20.30.0/24', '10.20.30.0/25', false],
    ['10.20.30.4', '10.20.30.4/32', false],
    ['10.20.30.4', '10.20.30.5', false],
  ])('%s and %s: %s', (first, second, same) => {
    expect(isSameRange(aRange(first), aRange(second))).toBe(same);
  });
});

describe('isPublicRange', () => {
  it.each([
    ['10.20.30.0/24', false],
    ['172.16.0.0/12', false],
    ['192.168.1.10', false],
    ['100.64.0.0/10', false],
    ['fd00::/8', false],
    ['::1', false],
    ['173.245.48.0/20', true],
    ['10.0.0.0/7', true],
    ['2400:cb00::/32', true],
  ])('%s is public: %s', (range, isPublic) => {
    expect(isPublicRange(aRange(range))).toBe(isPublic);
  });
});
