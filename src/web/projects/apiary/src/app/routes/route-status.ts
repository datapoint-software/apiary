import { Tone } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';

export function routeStatus(route: RouteView): [Tone, string] {
  return route.disabled ? ['off', 'Disabled'] : ['ok', 'Active'];
}
