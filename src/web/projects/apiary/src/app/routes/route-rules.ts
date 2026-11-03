import { applyEach, required, schema, validate } from '@angular/forms/signals';
import { hostname, port, target, wholeNumber } from '@datapoint/apiary-ui';
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
});
