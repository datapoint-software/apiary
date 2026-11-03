import { RouteView } from '../api/models';

export function routeLabel(route: Pick<RouteView, 'host' | 'path'>): string {
  return route.path === '/' ? route.host : route.host + route.path;
}

export function targetLabel(route: RouteView): string {
  return route.targets.map((t) => `${t.host}:${t.port}`).join(' · ');
}
