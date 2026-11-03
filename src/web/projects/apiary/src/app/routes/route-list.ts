import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, Confirmer, EmptyState, Icon, PageHead, Toaster } from '@datapoint/apiary-ui';
import { Plus, Search, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { ProjectView, RouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { RouteGroup } from './route-group';
import { routeLabel, targetLabel } from './route-label';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-route-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, RouterLink],
  templateUrl: './route-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteList {
  readonly project = input('');
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  protected readonly icons = { plus: Plus, search: Search, delete: Trash2 };
  protected readonly routeLabel = routeLabel;
  protected readonly targetLabel = targetLabel;
  protected readonly timeAgo = timeAgo;
  protected readonly filter = linkedSignal(() => '');
  protected readonly projectFilter = linkedSignal(() => this.project());

  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.routes.isLoading() && this.routes.value().length === 0);
  protected readonly projectOptions = computed(() => this.projects.value());
  protected readonly total = computed(() => this.routes.value().length);

  protected readonly shown = computed(() => {
    const text = this.filter().trim().toLowerCase();
    const project = this.projectFilter();
    return this.routes.value().filter((r) => {
      const matchesText = !text || `${r.host}${r.path} ${r.targets.map((t) => t.host).join(' ')}`.includes(text);
      return matchesText && (!project || r.projectId === project);
    });
  });

  protected readonly groups = computed<readonly RouteGroup[]>(() =>
    this.projects
      .value()
      .map((project) => ({ project, routes: this.shown().filter((r) => r.projectId === project.id) }))
      .filter((g) => g.routes.length > 0),
  );

  protected chooseProject(id: string): void {
    this.projectFilter.set(id);
    void this.router.navigate([], { queryParams: { project: id || null }, replaceUrl: true });
  }

  protected clearFilters(): void {
    this.filter.set('');
    this.chooseProject('');
  }

  protected async delete(route: RouteView): Promise<void> {
    const label = routeLabel(route);
    const deleted = await this.confirmer.confirm({
      heading: `Delete route ${label}?`,
      text: 'Requests to this hostname and path get a 404 on every replica as soon as you confirm.',
      confirm: 'Delete route',
      busy: 'Deleting…',
      typeToConfirm: route.host,
      action: () => this.api.send('routes.delete', { id: route.id }),
    });
    if (deleted) {
      this.toaster.show(`${label} deleted.`);
    }
  }
}
