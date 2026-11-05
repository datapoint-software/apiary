import {
  isUnder,
  pathError,
  redirectExample,
  redirectLabel,
  redirectPath,
  targetError,
} from './redirect-rules';

describe('redirect rules', () => {
  it.each([
    ['', '/'],
    [' / ', '/'],
    ['/old/', '/old'],
    [' /old ', '/old'],
  ])('reads the path %j as %j', (path, expected) => {
    expect(redirectPath(path)).toBe(expected);
  });

  it.each([
    [{ from: 'shop.example.com', path: '/' }, 'shop.example.com'],
    [{ from: 'shop.example.com', path: '/old' }, 'shop.example.com/old'],
  ])('names a redirect by its hostname and path', (redirect, label) => {
    expect(redirectLabel(redirect)).toBe(label);
  });

  it.each([
    ['/old', '/old', true],
    ['/OLD/page', '/old', true],
    ['/older', '/old', false],
    ['/anything', '/', true],
  ])('says whether %s is under %s', (path, prefix, under) => {
    expect(isUnder(path, prefix)).toBe(under);
  });

  it.each([
    ['old', 'path.invalid'],
    ['/old?x', 'path.invalid'],
    ['/a//b', 'path.invalid'],
    ['/../etc', 'path.invalid'],
    ['/.well-known/acme-challenge/token', 'redirect.pathReserved'],
    ['/.well-known', 'redirect.pathReserved'],
  ])('refuses the path %s', (path, kind) => {
    expect(pathError(path)).toBe(kind);
  });

  it.each(['', '/', '/old', '/.well-known/security.txt'])('accepts the path %j', (path) => {
    expect(pathError(path)).toBeUndefined();
  });

  it.each([
    ['example.com', '/old', 'redirect.targetInvalid'],
    ['//evil.example', '/old', 'redirect.targetInvalid'],
    ['https://example.com#top', '/old', 'redirect.targetInvalid'],
    ['/new', '/', 'redirect.relativeNeedsPath'],
    ['/old/new', '/old', 'redirect.loop'],
    ['/OLD?x=1', '/old', 'redirect.loop'],
    ['https://shop.example.com/old/new', '/old', 'redirect.loop'],
    ['https://shop.example.com/', '/', 'redirect.loop'],
  ])('refuses the target %s for the path %s', (to, path, kind) => {
    expect(targetError(to, 'shop.example.com', path)).toBe(kind);
  });

  it.each([
    ['/new', '/old'],
    ['/older', '/old'],
    ['https://shop.example.com/new', '/old'],
    ['https://example.com', '/'],
  ])('accepts the target %s for the path %s', (to, path) => {
    expect(targetError(to, 'shop.example.com', path)).toBeUndefined();
  });

  it('shows a whole hostname keeping the path', () => {
    expect(
      redirectExample({
        projectId: '',
        from: 'www.example.com',
        path: '',
        to: 'https://example.com/',
        statusCode: '308',
        keepPath: true,
      }),
    ).toEqual({
      from: 'www.example.com/shoes?ref=mail',
      to: 'https://example.com/shoes?ref=mail',
    });
  });

  it('shows a path keeping only what follows it', () => {
    expect(
      redirectExample({
        projectId: '',
        from: 'shop.example.com',
        path: '/old',
        to: '/new',
        statusCode: '308',
        keepPath: true,
      }),
    ).toEqual({
      from: 'shop.example.com/old/2026?ref=mail',
      to: 'shop.example.com/new/2026?ref=mail',
    });
  });

  it('shows a path dropped to the address alone', () => {
    expect(
      redirectExample({
        projectId: '',
        from: 'shop.example.com',
        path: '/old',
        to: 'https://example.com/new',
        statusCode: '308',
        keepPath: false,
      }),
    ).toEqual({
      from: 'shop.example.com/old/2026',
      to: 'https://example.com/new',
    });
  });

  it('shows nothing while the target is invalid', () => {
    expect(
      redirectExample({
        projectId: '',
        from: 'shop.example.com',
        path: '/old',
        to: '/old/x',
        statusCode: '308',
        keepPath: true,
      }),
    ).toBeUndefined();
  });
});
