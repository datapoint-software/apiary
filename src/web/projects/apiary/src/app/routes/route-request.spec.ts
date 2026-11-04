import { aPasswordModel, aRouteModel } from '../testing/builders';
import { PasswordSecrets, passwordSecrets, routeAccess, routeRequest } from './route-request';

const noSecrets: PasswordSecrets = { newPassword: null, newLinkKey: null };

function twoTargets() {
  return [
    { host: 'shop-v1', port: 8080, weight: 90 },
    { host: 'shop-v2', port: 8080, weight: 10 },
  ];
}

describe('routeRequest', () => {
  it('sends a custom request size in megabytes', () => {
    const model = aRouteModel({ requestSize: 'custom', requestCustom: { amount: 5, unit: 'GB' } });

    expect(routeRequest(model, noSecrets)).toMatchObject({ requestSize: 'custom', requestMegabytes: 5000 });
  });

  it('sends no size when the route uses the default or has no limit', () => {
    const model = aRouteModel({ requestSize: 'unlimited', requestCustom: { amount: 5, unit: 'GB' } });

    expect(routeRequest(model, noSecrets)).toMatchObject({ requestSize: 'unlimited', requestMegabytes: null });
  });

  it('trims the hostname, path and target names', () => {
    const model = aRouteModel({
      host: ' shop.example.com ',
      path: ' /cart ',
      targets: [{ host: ' shop-v1 ', port: 8080, weight: 100 }],
    });

    const request = routeRequest(model, noSecrets);

    expect(request).toMatchObject({
      host: 'shop.example.com',
      path: '/cart',
      targets: [{ host: 'shop-v1', port: 8080, weight: 100 }],
    });
  });

  it('sends a weight of 100 for a single target, whatever the form holds', () => {
    const model = aRouteModel({ targets: [{ host: 'shop-v1', port: 8080, weight: 40 }] });

    expect(routeRequest(model, noSecrets).targets[0].weight).toBe(100);
  });

  it('keeps the weights of several targets', () => {
    const model = aRouteModel({ targets: twoTargets() });

    expect(routeRequest(model, noSecrets).targets.map((t) => t.weight)).toEqual([90, 10]);
  });

  it('sends no certificate for an automatic one, even if one was chosen before', () => {
    const model = aRouteModel({ certificate: 'automatic', certificateId: 'certificate-9' });

    expect(routeRequest(model, noSecrets).certificateId).toBeNull();
  });

  it('sends the chosen uploaded certificate', () => {
    const model = aRouteModel({ certificate: 'uploaded', certificateId: 'certificate-9' });

    expect(routeRequest(model, noSecrets).certificateId).toBe('certificate-9');
  });

  it('sends one allowed address per non-blank line', () => {
    const model = aRouteModel({ allowedAddresses: ' 10.0.0.0/8 \n\n192.0.2.10\n' });

    expect(routeRequest(model, noSecrets).allowedAddresses).toEqual(['10.0.0.0/8', '192.0.2.10']);
  });

  it('sends no rate limit when it is off', () => {
    const model = aRouteModel({ rateLimited: false, rateLimit: 120 });

    expect(routeRequest(model, noSecrets).rateLimit).toBeNull();
  });

  it('sends the rate limit when it is on', () => {
    const model = aRouteModel({ rateLimited: true, rateLimit: 120 });

    expect(routeRequest(model, noSecrets).rateLimit).toBe(120);
  });

  it('sends no canary or sticky sessions for a single target', () => {
    const model = aRouteModel({
      canary: { source: 'header', name: 'X-Canary', value: 'true' },
      sticky: true,
    });

    const request = routeRequest(model, noSecrets);

    expect(request.canary).toBeNull();
    expect(request.sticky).toBe(false);
  });

  it('sends a trimmed canary for several targets', () => {
    const model = aRouteModel({
      targets: twoTargets(),
      canary: { source: 'cookie', name: ' beta ', value: ' yes ' },
    });

    expect(routeRequest(model, noSecrets).canary).toEqual({
      source: 'cookie',
      name: 'beta',
      value: 'yes',
    });
  });

  it('sends no password when it is off', () => {
    const model = aRouteModel({ password: aPasswordModel({ enabled: false }) });

    expect(routeRequest(model, noSecrets).password).toBeNull();
  });

  it('sends the password settings with the new secrets', () => {
    const model = aRouteModel({
      password: aPasswordModel({ days: '30', message: ' Ask Ana ', link: true }),
    });
    const secrets = { newPassword: 'correct-horse-battery-staple', newLinkKey: 'key-1' };

    expect(routeRequest(model, secrets).password).toEqual({
      newPassword: 'correct-horse-battery-staple',
      newLinkKey: 'key-1',
      days: 30,
      message: 'Ask Ana',
      link: true,
    });
  });
});

describe('passwordSecrets', () => {
  it('has none when the password is off', () => {
    expect(passwordSecrets(aPasswordModel({ enabled: false }), false)).toEqual(noSecrets);
  });

  it('sends the new password when it is being replaced', () => {
    const secrets = passwordSecrets(
      aPasswordModel({ replace: true, newPassword: 'correct-horse-battery-staple' }),
      false,
    );

    expect(secrets.newPassword).toBe('correct-horse-battery-staple');
  });

  it('keeps the current password when it is not being replaced', () => {
    expect(passwordSecrets(aPasswordModel({ replace: false }), false).newPassword).toBeNull();
  });

  it('makes a link key when a link is wanted and there is none yet', () => {
    const secrets = passwordSecrets(aPasswordModel({ link: true }), false);

    expect(secrets.newLinkKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('keeps the current link', () => {
    expect(
      passwordSecrets(aPasswordModel({ link: true, newLink: false }), true).newLinkKey,
    ).toBeNull();
  });

  it('makes a new link key when asked to replace the link', () => {
    expect(
      passwordSecrets(aPasswordModel({ link: true, newLink: true }), true).newLinkKey,
    ).not.toBeNull();
  });

  it('makes no link key when no link is wanted', () => {
    expect(passwordSecrets(aPasswordModel({ link: false }), false).newLinkKey).toBeNull();
  });
});

describe('routeAccess', () => {
  it('has nothing to show when no secret changed', () => {
    expect(routeAccess('shop.example.com', '/', noSecrets, false)).toBeUndefined();
  });

  it('shows the new password for the route', () => {
    const access = routeAccess(
      'Shop.Example.com',
      '/',
      { newPassword: 'pass-1', newLinkKey: null },
      false,
    );

    expect(access).toEqual({
      label: 'shop.example.com',
      password: 'pass-1',
      link: undefined,
      hasLink: false,
    });
  });

  it('builds the sign-in link from the lowercase hostname, path and key', () => {
    const access = routeAccess(
      'Shop.Example.com',
      '/cart',
      { newPassword: null, newLinkKey: 'key-1' },
      true,
    );

    expect(access?.link).toBe('https://shop.example.com/cart?apiary-key=key-1');
  });
});
