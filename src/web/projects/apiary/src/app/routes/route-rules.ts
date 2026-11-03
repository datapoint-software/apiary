import { applyEach, applyWhen, hidden, required, schema, validate } from '@angular/forms/signals';
import { dayMs, hostname, ipRanges, parseUtc, port, target, utcDateTime, wholeNumber } from '@datapoint/apiary-ui';
import { RouteModel } from './route-model';

export const routeRules = schema<RouteModel>((route) => {
  required(route.projectId, { error: { kind: 'project.notFound' } });
  hostname(route.host);
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
