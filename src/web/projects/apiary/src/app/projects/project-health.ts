import { Tone } from '@datapoint/apiary-ui';
import { ProjectView } from '../api/models';

export function projectHealth(project: ProjectView): [Tone, string] {
  if (project.routesDown > 0) {
    return ['critical', project.routesDown === 1 ? '1 route down' : `${project.routesDown} routes down`];
  }
  if (project.routesDegraded > 0) {
    return ['warn', project.routesDegraded === 1 ? '1 route degraded' : `${project.routesDegraded} routes degraded`];
  }
  return project.routeCount > 0 ? ['ok', 'Healthy'] : ['off', 'No routes'];
}
