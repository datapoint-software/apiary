import { Tone, formatUtc } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

function healthStatus(route: RouteView): [Tone, string] {
  switch (route.health) {
    case 'down':
      return ['critical', 'Route down'];
    case 'degraded':
      return ['warn', route.targetsDown === 1 ? '1 target down' : `${route.targetsDown} targets down`];
    case 'healthy':
      return ['ok', 'Healthy'];
    default:
      return ['off', 'Not checked yet'];
  }
}

export function routeStatus(route: RouteView, now = Date.now()): [Tone, string] {
  if (route.disabled) {
    return ['off', 'Disabled'];
  }
  const window = route.maintenance;
  if (window && Date.parse(window.start) <= now && now < Date.parse(window.end)) {
    return ['info', 'In maintenance'];
  }
  return healthStatus(route);
}

export function needsAttention(route: RouteView): boolean {
  return !route.disabled && (route.health === 'down' || route.health === 'degraded');
}

export function upcomingMaintenance(route: RouteView, now = Date.now()): string {
  const window = route.maintenance;
  return window && now < Date.parse(window.start) ? formatUtc(Date.parse(window.start)) : '';
}

export function perMinute(count: number): string {
  return count.toLocaleString('en-US');
}
