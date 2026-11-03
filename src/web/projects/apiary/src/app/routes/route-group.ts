import { ProjectView, RouteView } from '../api/models';

export interface RouteGroup {
  readonly project: ProjectView;
  readonly routes: readonly RouteView[];
}
