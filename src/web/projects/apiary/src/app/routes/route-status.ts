import { I18n, Tone, currentLanguage, formatUtc } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

function healthStatus(route: RouteView, i18n: I18n): [Tone, string] {
  switch (route.health) {
    case 'down':
      return ['critical', i18n.t('Route down')];
    case 'degraded':
      return ['warn', i18n.plural(route.targetsDown, '{count} target down', '{count} targets down')];
    case 'healthy':
      return ['ok', i18n.t('Healthy')];
    default:
      return ['off', i18n.t('Not checked yet')];
  }
}

export function routeStatus(route: RouteView, i18n: I18n, now = Date.now()): [Tone, string] {
  if (route.disabled) {
    return ['off', i18n.t('Disabled')];
  }
  const window = route.maintenance;
  if (window && Date.parse(window.start) <= now && now < Date.parse(window.end)) {
    return ['info', i18n.t('In maintenance')];
  }
  return healthStatus(route, i18n);
}

export function needsAttention(route: RouteView): boolean {
  return !route.disabled && (route.health === 'down' || route.health === 'degraded');
}

export function upcomingMaintenance(route: RouteView, now = Date.now()): string {
  const window = route.maintenance;
  return window && now < Date.parse(window.start) ? formatUtc(Date.parse(window.start)) : '';
}

export function perMinute(count: number): string {
  return count.toLocaleString(currentLanguage());
}
