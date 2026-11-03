import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, EmptyState, Icon, PageHead } from '@datapoint/apiary-ui';
import { Plus, Search } from 'lucide';
import { Api } from '../api/api';
import { ProjectView, RouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { RouteGroup } from './route-group';
import { routeLabel, targetLabel } from './route-label';
import { RouteStatusLabel } from './route-status-label';
import { RouteRowActions } from './route-row-actions';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-route-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, RouteStatusLabel, RouteRowActions, RouterLink],
  templateUrl: './route-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteList {
  readonly project = input('');
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly icons = { plus: Plus, search: Search };
  protected readonly statuses = [['all', 'All'], ['disabled', 'Disabled']] as const;
  protected readonly routeLabel = routeLabel;
  protected readonly targetLabel = targetLabel;
  protected readonly timeAgo = timeAgo;
  protected readonly filter = linkedSignal(() => '');
  protected readonly projectFilter = linkedSignal(() => this.project());
  protected readonly statusFilter = linkedSignal<string>(() => 'all');

  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.routes.isLoading() && this.routes.value().length === 0);
  protected readonly projectOptions = computed(() => this.projects.value());
  protected readonly total = computed(() => this.routes.value().length);

  protected readonly shown = computed(() => {
    const text = this.filter().trim().toLowerCase();
    const project = this.projectFilter();
    const disabledOnly = this.statusFilter() === 'disabled';
    return this.routes.value().filter((r) => {
      const matchesText = !text || `${r.host}${r.path} ${r.targets.map((t) => t.host).join(' ')}`.includes(text);
      return matchesText && (!project || r.projectId === project) && (!disabledOnly || r.disabled);
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
    this.statusFilter.set('all');
    this.chooseProject('');
  }
}
