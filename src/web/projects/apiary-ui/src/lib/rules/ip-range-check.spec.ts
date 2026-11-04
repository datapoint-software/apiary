import { checkIpRange } from './ip-range-check';

describe('checkIpRange', () => {
  it.each([
    ['192.0.2.10'],
    ['10.0.0.0/8'],
    ['0.0.0.0/0'],
    ['2001:db8::/32'],
    ['2001:db8::1'],
    ['::1'],
    ['::/0'],
    [' 10.0.0.0/8 '],
  ])('accepts %j', (value) => {
    expect(checkIpRange(value)).toBeNull();
  });

  it.each([
    [''],
    ['office'],
    ['10.0.0'],
    ['256.0.0.1'],
    ['10.0.0.0/33'],
    ['10.0.0.0/'],
    ['cafe'],
    ['2001:db8::/129'],
    ['2001::db8::1'],
    ['10.0.0.0/8, 192.0.2.0/24'],
  ])('refuses %j', (value) => {
    expect(checkIpRange(value)).toBe('ipRange.invalid');
  });
});
