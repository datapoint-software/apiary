import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';
import { aPasswordModel, aRouteModel } from '../testing/builders';
import { RouteModel } from './route-model';
import { routeRules } from './route-rules';

function routeForm(overrides: Partial<RouteModel> = {}): FieldTree<RouteModel> {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.runInInjectionContext(() =>
    form(
      signal(aRouteModel(overrides)),
      routeRules(() => undefined),
    ),
  );
}

function kinds(field: FieldTree<unknown>): string[] {
  return field()
    .errors()
    .map((error) => error.kind);
}

function allKinds(route: FieldTree<RouteModel>): string[] {
  return route()
    .errorSummary()
    .map((error) => error.kind);
}

function twoTargets(first: number, second: number) {
  return [
    { host: 'shop-v1', port: 8080, weight: first },
    { host: 'shop-v2', port: 8080, weight: second },
  ];
}

describe('routeRules', () => {
  it('accepts a complete route', () => {
    expect(allKinds(routeForm())).toEqual([]);
  });

  it('asks for a project', () => {
    const route = routeForm({ projectId: '' });

    expect(kinds(route.projectId)).toEqual(['project.notFound']);
  });

  it('checks the hostname', () => {
    const route = routeForm({ host: 'localhost' });

    expect(kinds(route.host)).toEqual(['hostname.notFull']);
  });

  it.each([
    ['', 'required'],
    ['cart', 'path.invalid'],
    ['/cart?page=2', 'path.invalid'],
    ['/cart#top', 'path.invalid'],
    ['/my cart', 'path.invalid'],
    ['/shop/../admin', 'path.invalid'],
    ['/shop//cart', 'path.invalid'],
  ])('refuses the path %j with %s', (path, code) => {
    const route = routeForm({ path });

    expect(kinds(route.path)).toEqual([code]);
  });

  it('accepts a path below the root', () => {
    const route = routeForm({ path: ' /shop/cart ' });

    expect(kinds(route.path)).toEqual([]);
  });

  it('checks each target’s port', () => {
    const route = routeForm({ targets: [{ host: 'shop-v1', port: null, weight: 100 }] });

    expect(kinds(route.targets[0].port)).toEqual(['port.required']);
  });

  it('asks for weights that add up to 100%', () => {
    const route = routeForm({ targets: twoTargets(80, 10) });

    expect(route.targets().errors()).toEqual([
      expect.objectContaining({ kind: 'route.weightsTotal', params: { total: 90 } }),
    ]);
  });

  it('accepts weights that add up to 100%', () => {
    const route = routeForm({ targets: twoTargets(90, 10) });

    expect(kinds(route.targets)).toEqual([]);
  });

  it('ignores the weight of a single target', () => {
    const route = routeForm({ targets: [{ host: 'shop-v1', port: 8080, weight: null }] });

    expect(allKinds(route)).toEqual([]);
  });

  it('checks the canary’s header name with several targets', () => {
    const route = routeForm({
      targets: twoTargets(90, 10),
      canary: { source: 'header', name: 'X Canary', value: 'true' },
    });

    expect(kinds(route.canary.name)).toEqual(['route.canaryName']);
  });

  it('ignores the canary when there is none', () => {
    const route = routeForm({
      targets: twoTargets(90, 10),
      canary: { source: 'none', name: '', value: '' },
    });

    expect(allKinds(route)).toEqual([]);
  });

  it('ignores the canary of a single target', () => {
    const route = routeForm({ canary: { source: 'header', name: '', value: '' } });

    expect(allKinds(route)).toEqual([]);
  });

  it('keeps the timeout between 1 and 3600 seconds', () => {
    const route = routeForm({ timeoutSeconds: 3601 });

    expect(route.timeoutSeconds().errors()).toEqual([
      expect.objectContaining({ kind: 'range', params: { min: 1, max: 3600 } }),
    ]);
  });

  it('accepts a timeout of an hour', () => {
    const route = routeForm({ timeoutSeconds: 3600 });

    expect(route.timeoutSeconds().errors()).toEqual([]);
  });

  it('keeps a custom request size between 1 MB and 100 GB', () => {
    const route = routeForm({ requestSize: 'custom', requestCustom: { amount: 101, unit: 'GB' } });

    expect(route.requestCustom.amount().errors()).toEqual([expect.objectContaining({ kind: 'route.requestSize' })]);
  });

  it('accepts 100 GB as a custom request size', () => {
    const route = routeForm({ requestSize: 'custom', requestCustom: { amount: 100, unit: 'GB' } });

    expect(route.requestCustom.amount().errors()).toEqual([]);
  });

  it('refuses a fraction of a megabyte', () => {
    const route = routeForm({ requestSize: 'custom', requestCustom: { amount: 0.5, unit: 'MB' } });

    expect(route.requestCustom.amount().errors()).toEqual([expect.objectContaining({ kind: 'route.requestSize' })]);
  });

  it('ignores the custom size when the route uses the default', () => {
    const route = routeForm({ requestSize: 'default', requestCustom: { amount: null, unit: 'MB' } });

    expect(allKinds(route)).toEqual([]);
  });

  it('checks each allowed address range', () => {
    const route = routeForm({ allowedAddresses: '10.0.0.0/8\nnot-an-address' });

    expect(kinds(route.allowedAddresses)).toEqual(['ipRange.invalid']);
  });

  it('checks the rate limit when it is on', () => {
    const route = routeForm({ rateLimited: true, rateLimit: 0 });

    expect(kinds(route.rateLimit)).toEqual(['range']);
  });

  it('ignores the rate limit when it is off', () => {
    const route = routeForm({ rateLimited: false, rateLimit: 0 });

    expect(allKinds(route)).toEqual([]);
  });

  it('refuses a maintenance window that ends before it starts', () => {
    const route = routeForm({
      maintenance: {
        scheduled: true,
        start: '2026-11-05 22:00',
        end: '2026-11-05 21:00',
        message: '',
      },
    });

    expect(kinds(route.maintenance.end)).toEqual(['maintenance.endBeforeStart']);
  });

  it('refuses a maintenance window longer than 7 days', () => {
    const route = routeForm({
      maintenance: {
        scheduled: true,
        start: '2026-11-05 22:00',
        end: '2026-11-12 22:01',
        message: '',
      },
    });

    expect(kinds(route.maintenance.end)).toEqual(['maintenance.tooLong']);
  });

  it('asks for maintenance times in UTC', () => {
    const route = routeForm({
      maintenance: { scheduled: true, start: '5 November', end: '2026-11-06 02:00', message: '' },
    });

    expect(kinds(route.maintenance.start)).toEqual(['dateTime.format']);
  });

  it('ignores the maintenance window when none is scheduled', () => {
    const route = routeForm({
      maintenance: { scheduled: false, start: 'soon', end: '', message: '' },
    });

    expect(allKinds(route)).toEqual([]);
  });

  it('asks for a new password of at least 12 characters', () => {
    const route = routeForm({ password: aPasswordModel({ newPassword: 'short' }) });

    expect(kinds(route.password.newPassword)).toEqual(['route.passwordShort']);
  });

  it('asks for a new password when replacing it', () => {
    const route = routeForm({ password: aPasswordModel({ newPassword: '  ' }) });

    expect(kinds(route.password.newPassword)).toEqual(['route.passwordRequired']);
  });

  it('ignores the new password when the current one is kept', () => {
    const route = routeForm({ password: aPasswordModel({ replace: false, newPassword: '' }) });

    expect(allKinds(route)).toEqual([]);
  });

  it('ignores the new password when the route has no password', () => {
    const route = routeForm({ password: aPasswordModel({ enabled: false, newPassword: '' }) });

    expect(allKinds(route)).toEqual([]);
  });

  it('asks which uploaded certificate to use', () => {
    const route = routeForm({ certificate: 'uploaded', certificateId: '' });

    expect(kinds(route.certificateId)).toEqual(['certificate.choose']);
  });
});
