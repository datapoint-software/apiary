import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState, Icon, PageHead } from '@datapoint/apiary-ui';
import { Pencil, Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { RouteSelectionBar } from '../routes/route-selection-bar';
import { RouteTable } from '../routes/route-table';
import { NotFound } from '../shell/not-found';
import { ProjectActions } from './project-actions';

@Component({
  selector: 'ap-project-page',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, RouterLink, RouteTable, RouteSelectionBar, NotFound],
  templateUrl: './project-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectPage {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  protected readonly actions = inject(ProjectActions);
  protected readonly icons = { add: Plus, edit: Pencil, delete: Trash2 };
  protected readonly crumbs = [{ label: 'Projects', link: '/projects' }];
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'));
  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), {
    defaultValue: [],
  });
  private readonly latestProjects = linkedSignal<ProjectView[] | undefined, ProjectView[] | undefined>({
    source: () => (this.projects.hasValue() ? this.projects.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });
  protected readonly project = computed(() => this.latestProjects()?.find((p) => p.id === this.id()));
  protected readonly isMissing = computed(() => this.projects.hasValue() && !this.project());
  protected readonly projectRoutes = computed(() => this.routes.value().filter((r) => r.projectId === this.id()));
  protected readonly disabledCount = computed(() => this.projectRoutes().filter((r) => r.disabled).length);
  protected readonly certificateCount = computed(() => {
    const hosts = new Set(this.projectRoutes().map((r) => r.host));
    return this.certificates
      .value()
      .filter((c) => c.projectId === this.id() || (c.source === 'automatic' && c.hosts.some((h) => hosts.has(h)))).length;
  });
  protected readonly groups = computed(() => {
    const project = this.project();
    return project ? [{ project, routes: this.projectRoutes() }] : [];
  });
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedRoutes = computed(() => this.projectRoutes().filter((r) => this.selected().has(r.id)));

  protected clearSelection(): void {
    this.selected.set(new Set());
  }
}
