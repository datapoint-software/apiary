import { checkHostname } from './hostname-check';

describe('checkHostname', () => {
  it.each([
    ['', 'hostname.required'],
    ['https://shop.example.com', 'hostname.scheme'],
    ['shop.example.com/cart', 'hostname.path'],
    ['shop.example.com:8080', 'hostname.path'],
    ['192.0.2.10', 'hostname.address'],
    ['localhost', 'hostname.notFull'],
    ['shop..example.com', 'hostname.consecutiveDots'],
    ['-shop.example.com', 'hostname.label'],
    ['shop_web.example.com', 'hostname.label'],
    [`${'a'.repeat(250)}.com`, 'hostname.tooLong'],
  ])('refuses %j with %s', (value, code) => {
    expect(checkHostname(value)).toBe(code);
  });

  it('accepts a full hostname', () => {
    expect(checkHostname(' shop.example.com ')).toBeNull();
  });
});
