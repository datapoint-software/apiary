import { hasRole } from './roles';

describe('hasRole', () => {
  it.each([
    ['viewer', 'viewer', true],
    ['viewer', 'operator', false],
    ['operator', 'operator', true],
    ['operator', 'administrator', false],
    ['administrator', 'viewer', true],
    ['administrator', 'administrator', true],
  ] as const)('gives a %s the %s role: %s', (role, required, expected) => {
    expect(hasRole(role, required)).toBe(expected);
  });

  it('gives nobody signed out any role', () => {
    expect(hasRole(undefined, 'viewer')).toBe(false);
  });
});
