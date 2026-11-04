import { I18n, Tone } from '@datapoint/apiary-ui';
import { ProjectView } from '../api/models';

export function projectHealth(project: ProjectView, i18n: I18n): [Tone, string] {
  if (project.routesDown > 0) {
    return ['critical', i18n.plural(project.routesDown, '{count} route down', '{count} routes down')];
  }
  if (project.routesDegraded > 0) {
    return ['warn', i18n.plural(project.routesDegraded, '{count} route degraded', '{count} routes degraded')];
  }
  return project.routeCount > 0 ? ['ok', i18n.t('Healthy')] : ['off', i18n.t('No routes')];
}
