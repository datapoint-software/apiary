import { I18n } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

export function routeLabel(route: Pick<RouteView, 'host' | 'path'>): string {
  return route.path === '/' ? route.host : route.host + route.path;
}

export function targetLabel(route: RouteView, i18n: I18n): string {
  if (route.targets.length === 1) {
    return `${route.targets[0].host}:${route.targets[0].port}`;
  }
  return route.targets.map((t) => `${t.host} ${t.weight}%`).join(' · ') + (route.canary ? ` · ${i18n.t('canary')}` : '');
}
