import { checkTarget } from './target-check';

describe('checkTarget', () => {
  it.each([
    ['', 'target.required'],
    ['   ', 'target.required'],
    ['shop-v1:8080', 'target.port'],
    ['192.0.2.10:8080', 'target.port'],
    ['localhost', 'target.loopback'],
    ['LOCALHOST', 'target.loopback'],
    ['shop.localhost', 'target.loopback'],
    ['127.0.0.1', 'target.loopback'],
    ['127.10.20.30', 'target.loopback'],
    ['::1', 'target.loopback'],
    ['[::1]', 'target.loopback'],
    ['169.254.169.254', 'target.linkLocal'],
    ['100.100.100.200', 'target.linkLocal'],
    ['fe80::1', 'target.linkLocal'],
    ['fd00:ec2::254', 'target.linkLocal'],
    ['0.0.0.0', 'target.unspecified'],
    ['::', 'target.unspecified'],
    ['-shop', 'target.invalid'],
    ['shop v1', 'target.invalid'],
    ['shop/v1', 'target.invalid'],
  ])('refuses %j with %s', (value, code) => {
    expect(checkTarget(value)).toBe(code);
  });

  it.each([
    ['shop-v1'],
    ['shop_v1'],
    ['Shop-V1'],
    ['shop.internal.example.com'],
    ['192.0.2.10'],
    ['2001:db8::10'],
    ['[2001:db8::10]'],
    [' shop-v1 '],
  ])('accepts %j', (value) => {
    expect(checkTarget(value)).toBeNull();
  });
});
