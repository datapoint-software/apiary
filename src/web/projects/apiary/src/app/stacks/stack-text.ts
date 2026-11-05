import { I18n, TextParams } from '@datapoint/apiary-ui';
import { StackItemKind, StackPlan, StackView } from '../api/models';

export const tokenDays: readonly (readonly [number, string])[] = [
  [30, '30 days'],
  [90, '90 days'],
  [365, '1 year'],
];

export const kindLabels: Record<StackItemKind, string> = {
  route: 'Route',
  streamRoute: 'Stream route',
  redirect: 'Redirect',
};

export const fieldLabels: Record<string, string> = {
  host: 'Hostname',
  path: 'Path',
  targets: 'Target',
  project: 'Project',
  timeout: 'Timeout',
  rateLimit: 'Rate limit',
  name: 'Name',
  protocol: 'Protocol',
  listen: 'Listen port',
  target: 'Target',
  port: 'Target port',
  from: 'From',
  to: 'To',
  statusCode: 'Status code',
  keepPath: 'Path',
};

const detailParams: Record<string, string> = {
  'route.hostInUse': 'host',
  'stream.portTaken': 'port',
  'stack.removesEverything': 'count',
};

export function isStackName(name: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,62}$/.test(name);
}

export function planCount(plan: StackPlan): number {
  return plan.added.length + plan.changed.length + plan.removed.length;
}

export function declared(stack: StackView, i18n: I18n): string[] {
  return [
    stack.routes ? i18n.plural(stack.routes, '{count} route', '{count} routes') : '',
    stack.streamRoutes
      ? i18n.plural(stack.streamRoutes, '{count} stream route', '{count} stream routes')
      : '',
    stack.redirects ? i18n.plural(stack.redirects, '{count} redirect', '{count} redirects') : '',
  ].filter((text) => text !== '');
}

export function failureParams(code: string, detail: string | undefined): TextParams {
  const name = detailParams[code];
  return name && detail !== undefined ? { [name]: detail } : {};
}
