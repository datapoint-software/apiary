import { Dialog } from '@angular/cdk/dialog';
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
  I18n,
  PageHead,
  Status,
  Toaster,
  TranslatePipe,
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
import { AccessSection } from './access-section';
import { MaintenanceSection } from './maintenance-section';
import { TargetsSection } from './targets-section';
import { RouteDangerZone } from './route-danger-zone';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { passwordSecrets, routeAccess, routeRequest } from './route-request';
import { RouteAccessData, RouteAccessDialog } from './route-access-dialog';

@Component({
  selector: 'ap-route-editor',
  imports: [WriteLock, PageHead, Field, Form, ErrorSummary, FormField, Button, Banner, Status, RouteDangerZone, AccessSection, MaintenanceSection, TargetsSection, RouterLink, TranslatePipe],
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
  private readonly dialog = inject(Dialog);
  private readonly i18n = inject(I18n);
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
    return route ? routeStatus(route, this.i18n) : undefined;
  });

  protected readonly model = signal<RouteModel>(emptyRoute(''));
  protected readonly route = form(this.model, routeRules(() => this.id()));
  protected readonly loadError = computed(() => {
    const error = this.existing.error();
    return error ? this.messages.describe('route.notFound') : '';
  });
  protected readonly heading = computed(() => {
    const route = this.existing.value();
    return this.isNew() || !route ? this.i18n.t('New route') : routeLabel(route);
  });
  protected readonly changed = computed(() => {
    const route = this.existing.value();
    if (!route) {
      return '';
    }
    const time = timeAgo(route.changedAt);
    return route.changedBy ? this.i18n.t('Changed {time} by {name}', { time, name: route.changedBy }) : this.i18n.t('Changed {time}', { time });
  });
  protected readonly crumbs = computed(() => [{ label: this.i18n.t('All routes'), link: '/routes' }]);
  protected readonly submitLabel = computed(() => {
    if (this.route().submitting()) {
      return this.i18n.t('Saving…');
    }
    return this.i18n.t(this.isNew() ? 'Create route' : 'Save route');
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
    let access: RouteAccessData | undefined;
    const saved = await form.submit(async () => {
      try {
        access = await this.persist();
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.route);
      }
    });
    if (saved) {
      this.saved = true;
      if (access) {
        await openDialog<void, RouteAccessData>(this.dialog, RouteAccessDialog, access);
      } else {
        this.toaster.show(this.i18n.t('{route} saved. It applies on every replica now.', { route: routeLabel(this.model()) }));
      }
      await this.router.navigate(['/routes']);
    }
  }

  protected async leave(): Promise<void> {
    this.saved = true;
    await this.router.navigate(['/routes']);
  }

  private async persist(): Promise<RouteAccessData | undefined> {
    const value = this.model();
    const secrets = passwordSecrets(value.password, !!this.existing.value()?.password?.linkMadeAt);
    const body = routeRequest(value, secrets);
    const id = this.id();
    await (id ? this.api.send('routes.update', { id, ...body }) : this.api.send('routes.create', body));
    return routeAccess(body.host, body.path, secrets, value.password.enabled && value.password.link);
  }
}
