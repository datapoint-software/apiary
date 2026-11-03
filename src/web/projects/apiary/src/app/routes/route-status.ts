import { Tone, formatUtc } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

export function routeStatus(route: RouteView, now = Date.now()): [Tone, string] {
  if (route.disabled) {
    return ['off', 'Disabled'];
  }
  const window = route.maintenance;
  if (window && Date.parse(window.start) <= now && now < Date.parse(window.end)) {
    return ['info', 'In maintenance'];
  }
  return ['ok', 'Active'];
}

export function upcomingMaintenance(route: RouteView, now = Date.now()): string {
  const window = route.maintenance;
  return window && now < Date.parse(window.start) ? formatUtc(Date.parse(window.start)) : '';
}
