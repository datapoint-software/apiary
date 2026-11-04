import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { ApiFieldError, ApiProblem } from './api-problem';
import { problemErrors } from './problem-errors';

function aRouteForm() {
  return TestBed.runInInjectionContext(() =>
    form(signal({ hostname: '', path: '/', targets: [{ host: '', port: 8080 }] })),
  );
}

function aProblem(errors?: readonly ApiFieldError[]): ApiProblem {
  return { status: 400, code: 'request.invalid', errors };
}

describe('problemErrors', () => {
  it('puts a problem without field errors on the form itself', () => {
    const route = aRouteForm();

    const errors = problemErrors({ status: 503, code: 'cluster.noQuorum' }, route);

    expect(errors).toEqual([{ kind: 'cluster.noQuorum', fieldTree: route }]);
  });

  it('puts a problem with an empty error list on the form itself', () => {
    const route = aRouteForm();

    const errors = problemErrors(aProblem([]), route);

    expect(errors).toEqual([{ kind: 'request.invalid', fieldTree: route }]);
  });

  it('puts a field error on the field of the same name', () => {
    const route = aRouteForm();

    const [error] = problemErrors(aProblem([{ field: 'hostname', code: 'hostname.label' }]), route);

    expect(error.fieldTree).toBe(route.hostname);
  });

  it('uses the error code as the kind', () => {
    const route = aRouteForm();

    const [error] = problemErrors(aProblem([{ field: 'hostname', code: 'hostname.label' }]), route);

    expect(error.kind).toBe('hostname.label');
  });

  it('keeps the error parameters', () => {
    const route = aRouteForm();
    const params = { min: 1, max: 65535 };

    const [error] = problemErrors(aProblem([{ field: 'path', code: 'range', params }]), route);

    expect(error).toMatchObject({ params });
  });

  it('follows an indexed path into a list', () => {
    const route = aRouteForm();

    const [error] = problemErrors(
      aProblem([{ field: 'targets[0].host', code: 'target.loopback' }]),
      route,
    );

    expect(error.fieldTree).toBe(route.targets[0].host);
  });

  it('follows a dotted index into a list', () => {
    const route = aRouteForm();

    const [error] = problemErrors(aProblem([{ field: 'targets.0.port', code: 'range' }]), route);

    expect(error.fieldTree).toBe(route.targets[0].port);
  });

  it('puts an error for an unknown field on the form itself', () => {
    const route = aRouteForm();

    const [error] = problemErrors(aProblem([{ field: 'certificate', code: 'invalid' }]), route);

    expect(error.fieldTree).toBe(route);
  });

  it('puts an error for an index beyond the list on the form itself', () => {
    const route = aRouteForm();

    const [error] = problemErrors(aProblem([{ field: 'targets[3].host', code: 'invalid' }]), route);

    expect(error.fieldTree).toBe(route);
  });

  it('maps every field error', () => {
    const route = aRouteForm();

    const errors = problemErrors(
      aProblem([
        { field: 'hostname', code: 'hostname.label' },
        { field: 'path', code: 'path.invalid' },
      ]),
      route,
    );

    expect(errors.map((error) => error.kind)).toEqual(['hostname.label', 'path.invalid']);
  });
});
