import { aRoute } from '../testing/builders';
import { emptyRoute, maintenanceWindow, routeModel } from './route-model';

describe('emptyRoute', () => {
  it('starts in the given project with one target on port 8080 at the root path', () => {
    const model = emptyRoute('project-7');

    expect(model).toMatchObject({
      projectId: 'project-7',
      path: '/',
      targets: [{ host: '', port: 8080, weight: 100 }],
    });
  });

  it('starts without a password, with a generated passphrase ready to use', () => {
    const { password } = emptyRoute('project-1');

    expect(password.enabled).toBe(false);
    expect(password.newPassword).toMatch(/^[a-z]+(?:-[a-z]+){3}-\d{2}$/);
  });
});

describe('emptyRoute request size', () => {
  it('uses the cluster default, with the default filled in for a custom size', () => {
    const model = emptyRoute('project-1', 5000);

    expect(model.requestSize).toBe('default');
    expect(model.requestCustom).toEqual({ amount: 5, unit: 'GB' });
  });
});

describe('routeModel', () => {
  it('keeps the route’s own request size', () => {
    const model = routeModel(aRoute({ requestSize: 'custom', requestMegabytes: 500 }), 30);

    expect(model.requestSize).toBe('custom');
    expect(model.requestCustom).toEqual({ amount: 500, unit: 'MB' });
  });

  it('offers the cluster default as a custom size when the route has none', () => {
    const model = routeModel(aRoute({ requestSize: 'unlimited' }), 2000);

    expect(model.requestSize).toBe('unlimited');
    expect(model.requestCustom).toEqual({ amount: 2, unit: 'GB' });
  });

  it('chooses an uploaded certificate when the route has one', () => {
    const model = routeModel(aRoute({ certificateId: 'certificate-9' }));

    expect(model.certificate).toBe('uploaded');
    expect(model.certificateId).toBe('certificate-9');
  });

  it('chooses an automatic certificate when the route has none', () => {
    const model = routeModel(aRoute());

    expect(model.certificate).toBe('automatic');
    expect(model.certificateId).toBe('');
  });

  it('puts each allowed address on its own line', () => {
    const model = routeModel(aRoute({ allowedAddresses: ['10.0.0.0/8', '192.0.2.10'] }));

    expect(model.allowedAddresses).toBe('10.0.0.0/8\n192.0.2.10');
  });

  it('offers a rate limit of 600 when the route has none', () => {
    const model = routeModel(aRoute());

    expect(model.rateLimited).toBe(false);
    expect(model.rateLimit).toBe(600);
  });

  it('keeps the route’s rate limit', () => {
    const model = routeModel(aRoute({ rateLimit: 120 }));

    expect(model.rateLimited).toBe(true);
    expect(model.rateLimit).toBe(120);
  });

  it('shows a maintenance window in UTC', () => {
    const route = aRoute({
      maintenance: {
        start: '2026-11-05T22:00:00Z',
        end: '2026-11-06T02:30:00Z',
        message: 'Upgrading',
      },
    });

    expect(routeModel(route).maintenance).toEqual({
      scheduled: true,
      start: '2026-11-05 22:00',
      end: '2026-11-06 02:30',
      message: 'Upgrading',
    });
  });

  it('has no canary when the route has none', () => {
    expect(routeModel(aRoute()).canary.source).toBe('none');
  });

  it('keeps the route’s password without revealing it', () => {
    const route = aRoute({
      password: { setAt: '2026-11-01T10:00:00Z', days: 30, linkMadeAt: '2026-11-01T10:00:00Z' },
    });

    expect(routeModel(route).password).toEqual({
      enabled: true,
      replace: false,
      newPassword: '',
      days: '30',
      message: '',
      link: true,
      newLink: false,
    });
  });
});

describe('maintenanceWindow', () => {
  it('is null when nothing is scheduled', () => {
    expect(maintenanceWindow({ scheduled: false, start: '', end: '', message: '' })).toBeNull();
  });

  it('turns the UTC times into ISO timestamps', () => {
    const window = maintenanceWindow({
      scheduled: true,
      start: '2026-11-05 22:00',
      end: '2026-11-06 02:30',
      message: ' Upgrading ',
    });

    expect(window).toEqual({
      start: '2026-11-05T22:00:00.000Z',
      end: '2026-11-06T02:30:00.000Z',
      message: 'Upgrading',
    });
  });

  it('leaves out a blank message', () => {
    const window = maintenanceWindow({
      scheduled: true,
      start: '2026-11-05 22:00',
      end: '2026-11-06 02:30',
      message: '   ',
    });

    expect(window?.message).toBeUndefined();
  });
});
