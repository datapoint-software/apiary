import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';
import { RedirectModel, redirectExample, redirectLabel, redirectPath, redirectRules, wholeHost } from './redirect-rules';

export interface AddedRedirect {
  readonly from: string;
  readonly to: string;
}

export interface RedirectHost {
  readonly host: string;
  readonly projectId: string;
}

@Component({
  selector: 'ap-redirect-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  templateUrl: './redirect-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectDialog {
  protected readonly dialog = inject<DialogRef<AddedRedirect>>(DialogRef);
  protected readonly fixed = inject<RedirectHost | null>(DIALOG_DATA, { optional: true }) ?? null;
  private readonly api = inject(Api);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly model = signal<RedirectModel>({
    projectId: this.fixed?.projectId ?? '',
    from: this.fixed?.host ?? '',
    path: '',
    to: '',
    statusCode: '308',
    keepPath: true,
  });
  protected readonly redirect = form(this.model, redirectRules(this.fixed !== null));
  protected readonly example = computed(() => redirectExample(this.model()));
  protected readonly types = [
    ['308', 'Permanent', 'Search engines move to the new address, and browsers remember it. Keeps POST requests as POST.'],
    ['307', 'Temporary', 'Search engines keep the old address. Use it until you are sure.'],
  ] as const;

  constructor() {
    effect(() => {
      const projects = this.projects.value();
      if (!this.model().projectId && projects.length > 0) {
        this.model.update((m) => ({ ...m, projectId: projects[0].id }));
      }
    });
  }

  protected async add(apForm: Form): Promise<void> {
    const value = this.model();
    const path = redirectPath(value.path);
    const added = await apForm.submit(async () => {
      try {
        await this.api.send<string>('redirects.create', {
          projectId: value.projectId,
          from: value.from.trim(),
          to: value.to.trim(),
          statusCode: Number(value.statusCode),
          keepPath: value.keepPath,
          ...(path === wholeHost ? {} : { path }),
        });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.redirect);
      }
    });
    if (added) {
      this.dialog.close({ from: redirectLabel({ from: value.from.trim().toLowerCase(), path }), to: value.to.trim() });
    }
  }
}
