import { applyEach, applyWhen, disabled, hidden, required, schema, validate } from '@angular/forms/signals';
import { dayMs, hostname, ipRanges, parseUtc, port, target, utcDateTime, wholeNumber } from '@datapoint/apiary-ui';
import { DnsProviderView } from '../api/models';
import { serverCheck } from '../api/server-check';
import { providerCovers } from '../dns-providers/dns-names';
import { RouteModel } from './route-model';
import { requestSize } from './request-size';

function challengeError(challenge: string, host: string, providers: readonly DnsProviderView[]): string | null {
  const provider = providers.find((p) => p.id === challenge);
  const hostname = host.trim();
  return provider && hostname && !providerCovers(provider, hostname) ? 'certificate.providerDoesNotCover' : null;
}

export const routeRules = (
  id: () => string | undefined,
  stackFields: () => readonly string[] = () => [],
  providers: () => readonly DnsProviderView[] = () => [],
) => schema<RouteModel>((route) => {
  const setByStack = (field: string) => () => stackFields().includes(field);
  disabled(route.host, setByStack('host'));
  disabled(route.path, setByStack('path'));
  disabled(route.projectId, setByStack('project'));
  disabled(route.targets, setByStack('targets'));
  disabled(route.timeoutSeconds, setByStack('timeout'));
  disabled(route.rateLimited, setByStack('rateLimit'));
  disabled(route.rateLimit, setByStack('rateLimit'));
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
  wholeNumber(route.timeoutSeconds, 1, 3600);
  hidden(route.requestCustom.amount, ({ valueOf }) => valueOf(route.requestSize) !== 'custom');
  requestSize(route.requestCustom.amount, route.requestCustom.unit);
  ipRanges(route.allowedAddresses);
  hidden(route.rateLimit, ({ valueOf }) => !valueOf(route.rateLimited));
  wholeNumber(route.rateLimit, 1, 100000);
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
  for (const path of [route.password.days, route.password.message]) {
    hidden(path, ({ valueOf }) => !valueOf(route.password.enabled));
  }
  hidden(route.password.newPassword, ({ valueOf }) => !valueOf(route.password.enabled) || !valueOf(route.password.replace));
  validate(route.password.newPassword, ({ value }) => {
    const password = value();
    if (!password.trim()) {
      return { kind: 'route.passwordRequired' };
    }
    if (password.length < 12) {
      return { kind: 'route.passwordShort' };
    }
    return password.length > 128 ? { kind: 'tooLong', params: { max: 128 } } : undefined;
  });
  validate(route.password.message, ({ value }) => (value().length > 120 ? { kind: 'tooLong', params: { max: 120 } } : undefined));
  hidden(route.challenge, ({ valueOf }) => valueOf(route.certificate) !== 'automatic');
  validate(route.challenge, ({ value, valueOf }) => {
    const kind = challengeError(value(), valueOf(route.host), providers());
    return kind ? { kind } : undefined;
  });
  applyWhen(route, ({ value }) => value().certificate === 'uploaded', (uploaded) => {
    required(uploaded.certificateId, { error: { kind: 'certificate.choose' } });
  });
});
