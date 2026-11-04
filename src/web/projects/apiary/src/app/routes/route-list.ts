import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, EmptyState, I18n, Icon, PageHead, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus, Search } from 'lucide';
import { reloadEvery } from '../api/reload-every';
import { Api } from '../api/api';
import { ProjectView, RouteView } from '../api/models';
import { RouteGroup } from './route-group';
import { needsAttention } from './route-status';
import { RouteDefaultsPanel } from './route-defaults-panel';
import { RouteSelectionBar } from './route-selection-bar';
import { RouteTable } from './route-table';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';

function matchesText(route: RouteView, text: string): boolean {
  return !text || `${route.host}${route.path} ${route.targets.map((t) => t.host).join(' ')}`.includes(text);
}

function matchesStatus(route: RouteView, status: string): boolean {
  if (status === 'disabled') {
    return route.disabled;
  }
  return status !== 'attention' || needsAttention(route);
}

@Component({
  selector: 'ap-route-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, RouteTable, RouteSelectionBar, RouteDefaultsPanel, RouterLink, TranslatePipe],
  templateUrl: './route-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteList {
  readonly project = input('');
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly icons = { plus: Plus, search: Search };
  protected readonly statuses = [['all', 'All'], ['attention', 'Needs attention'], ['disabled', 'Disabled']] as const;
  protected readonly filter = linkedSignal(() => '');
  protected readonly projectFilter = linkedSignal(() => this.project());
  protected readonly statusFilter = linkedSignal<string>(() => 'all');

  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  protected readonly allRoutes = computed(() => this.routes.value());
  private readonly routesRefresh = reloadEvery(this.routes);
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.routes.isLoading() && this.routes.value().length === 0);
  protected readonly projectOptions = computed(() => this.projects.value());
  protected readonly total = computed(() => this.routes.value().length);

  protected readonly shown = computed(() => {
    const text = this.filter().trim().toLowerCase();
    const project = this.projectFilter();
    const status = this.statusFilter();
    return this.routes.value().filter(
      (r) => (!project || r.projectId === project) && matchesText(r, text) && matchesStatus(r, status),
    );
  });

  protected readonly count = computed(() =>
    this.i18n.plural(this.total(), '{shown} of {count} route', '{shown} of {count} routes', { shown: this.shown().length }),
  );

  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedRoutes = computed(() => this.shown().filter((r) => this.selected().has(r.id)));

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

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected clearFilters(): void {
    this.filter.set('');
    this.statusFilter.set('all');
    this.chooseProject('');
  }
}
