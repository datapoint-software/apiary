import { applyEach, applyWhen, hidden, required, schema, validate } from '@angular/forms/signals';
import { dayMs, hostname, ipRanges, parseUtc, port, target, utcDateTime, wholeNumber } from '@datapoint/apiary-ui';
import { serverCheck } from '../api/server-check';
import { RouteModel } from './route-model';

export const routeRules = (id: () => string | undefined) => schema<RouteModel>((route) => {
  required(route.projectId, { error: { kind: 'project.notFound' } });
  hostname(route.host);
  serverCheck(route.host, 'routes.check', ['host', 'path'], ({ value, valueOf }) => ({ host: value(), path: valueOf(route.path), id: id() || null }));
  serverCheck(route.path, 'routes.check', ['path'], ({ value, valueOf }) => ({ host: valueOf(route.host), path: value(), id: id() || null }));
  validate(route.path, ({ value }) => {
    const path = value().trim();
    if (!path) {
      return { kind: 'required' };
    }
    const isValid = path.startsWith('/') && !/[?#\s]|\.\.|\/\//.test(path);
    return isValid ? undefined : { kind: 'path.invalid' };
  });
  applyEach(route.targets, (t) => {
    target(t.host);
    port(t.port);
    hidden(t.weight, ({ valueOf }) => valueOf(route.targets).length < 2);
    wholeNumber(t.weight, 0, 100);
  });
  validate(route.targets, ({ value }) => {
    const targets = value();
    const total = targets.reduce((sum, t) => sum + (t.weight ?? 0), 0);
    return targets.length > 1 && total !== 100 ? { kind: 'route.weightsTotal', params: { total } } : undefined;
  });
  for (const path of [route.canary.name, route.canary.value]) {
    hidden(path, ({ valueOf }) => valueOf(route.targets).length < 2 || valueOf(route.canary.source) === 'none');
  }
  validate(route.canary.name, ({ value }) => (/^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$/.test(value().trim()) ? undefined : { kind: 'route.canaryName' }));
  validate(route.canary.value, ({ value }) => {
    const text = value().trim();
    if (!text) {
      return { kind: 'required' };
    }
    return text.length > 200 ? { kind: 'tooLong', params: { max: 200 } } : undefined;
  });
  wholeNumber(route.timeoutSeconds, 1, 120);
  ipRanges(route.allowedAddresses);
  for (const path of [route.maintenance.start, route.maintenance.end, route.maintenance.message]) {
    hidden(path, ({ valueOf }) => !valueOf(route.maintenance.scheduled));
  }
  applyWhen(route.maintenance, ({ value }) => value().scheduled, (window) => {
    utcDateTime(window.start);
    utcDateTime(window.end);
    validate(window.end, ({ value, valueOf }) => {
      const start = parseUtc(valueOf(window.start));
      const end = parseUtc(value());
      if (start === null || end === null) {
        return undefined;
      }
      if (end <= start) {
        return { kind: 'maintenance.endBeforeStart' };
      }
      return end - start > 7 * dayMs ? { kind: 'maintenance.tooLong' } : undefined;
    });
    validate(window.message, ({ value }) => (value().length > 200 ? { kind: 'tooLong', params: { max: 200 } } : undefined));
  });
  applyWhen(route, ({ value }) => value().certificate === 'uploaded', (uploaded) => {
    required(uploaded.certificateId, { error: { kind: 'certificate.choose' } });
  });
});
