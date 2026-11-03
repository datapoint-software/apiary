import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  ApiProblem,
  Banner,
  Button,
  ErrorMessages,
  ErrorSummary,
  Field,
  Form,
  PageHead,
  Status,
  parseUtc,
  Toaster,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView, RouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { HasUnsavedChanges } from '../shell/has-unsaved-changes';
import { routeLabel } from './route-label';
import { RouteModel, emptyRoute, routeModel } from './route-model';
import { routeRules } from './route-rules';
import { perMinute, routeStatus } from './route-status';
import { MaintenanceSection } from './maintenance-section';
import { TargetsSection } from './targets-section';
import { RouteDangerZone } from './route-danger-zone';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-route-editor',
  imports: [WriteLock, PageHead, Field, Form, ErrorSummary, FormField, Button, Banner, Status, RouteDangerZone, MaintenanceSection, TargetsSection, RouterLink],
  templateUrl: './route-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteEditor implements HasUnsavedChanges {
  readonly id = input<string>();
  readonly project = input('');
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private saved = false;

  protected readonly isNew = computed(() => !this.id());
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly uploaded = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), {
    defaultValue: [],
    parse: (value) => (value as CertificateSummary[]).filter((c) => c.source === 'uploaded'),
  });
  protected readonly existing = httpResource<RouteView>(() => {
    const id = this.id();
    return id ? this.api.query('routes.get', { id }) : undefined;
  });
  protected readonly requests = computed(() => perMinute(this.existing.value()?.requestsPerMinute ?? 0));
  protected readonly status = computed(() => {
    const route = this.existing.value();
    return route ? routeStatus(route) : undefined;
  });

  protected readonly model = signal<RouteModel>(emptyRoute(''));
  protected readonly route = form(this.model, routeRules);
  protected readonly loadError = computed(() => {
    const error = this.existing.error();
    return error ? this.messages.describe('route.notFound') : '';
  });
  protected readonly heading = computed(() => {
    const route = this.existing.value();
    return this.isNew() || !route ? 'New route' : routeLabel(route);
  });
  protected readonly changed = computed(() => {
    const route = this.existing.value();
    return route ? `Changed ${timeAgo(route.changedAt)}${route.changedBy ? ` by ${route.changedBy}` : ''}` : '';
  });

  constructor() {
    effect(() => {
      const route = this.existing.value();
      if (route && !untracked(() => this.route().dirty())) {
        this.model.set(routeModel(route));
      }
    });
    effect(() => {
      const projects = this.projects.value();
      const fallback = this.project() || (projects.length === 1 ? projects[0].id : '');
      if (this.isNew() && !this.model().projectId && fallback) {
        this.model.update((m) => ({ ...m, projectId: fallback }));
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && this.route().dirty();
  }

  protected async save(form: Form): Promise<void> {
    const saved = await form.submit(async () => {
      try {
        await this.persist();
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.route);
      }
    });
    if (saved) {
      this.saved = true;
      this.toaster.show(`${routeLabel(this.model())} saved. It applies on every replica now.`);
      await this.router.navigate(['/routes']);
    }
  }

  protected async leave(): Promise<void> {
    this.saved = true;
    await this.router.navigate(['/routes']);
  }

  private async persist(): Promise<void> {
    const value = this.model();
    const body = {
      projectId: value.projectId,
      host: value.host.trim(),
      path: value.path.trim(),
      targets: value.targets.map((t) => ({ host: t.host.trim(), port: t.port, weight: value.targets.length > 1 ? t.weight : 100 })),
      timeoutSeconds: value.timeoutSeconds,
      certificateId: value.certificate === 'uploaded' ? value.certificateId : null,
      allowedAddresses: value.allowedAddresses.split('\n').map((line) => line.trim()).filter(Boolean),
      maintenance: value.maintenance.scheduled
        ? {
            start: new Date(parseUtc(value.maintenance.start) ?? 0).toISOString(),
            end: new Date(parseUtc(value.maintenance.end) ?? 0).toISOString(),
            message: value.maintenance.message.trim() || null,
          }
        : null,
      canary: value.targets.length > 1 && value.canary.source !== 'none'
        ? { source: value.canary.source, name: value.canary.name.trim(), value: value.canary.value.trim() }
        : null,
      sticky: value.targets.length > 1 && value.sticky,
    };
    const id = this.id();
    await (id ? this.api.send('routes.update', { id, ...body }) : this.api.send('routes.create', body));
  }
}
