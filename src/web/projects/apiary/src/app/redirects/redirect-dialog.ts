import { DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, TranslatePipe, hostname, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { serverCheck } from '../api/server-check';
import { ProjectView } from '../api/models';

export interface AddedRedirect {
  readonly from: string;
  readonly to: string;
}

interface RedirectModel {
  projectId: string;
  from: string;
  to: string;
  statusCode: string;
  keepPath: boolean;
}

function checkTarget(to: string, from: string): string | undefined {
  let url: URL;
  try {
    url = new URL(to.trim());
  } catch {
    return 'redirect.targetInvalid';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'redirect.targetInvalid';
  }
  return url.hostname === from.trim().toLowerCase() ? 'redirect.loop' : undefined;
}

@Component({
  selector: 'ap-redirect-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  templateUrl: './redirect-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectDialog {
  protected readonly dialog = inject<DialogRef<AddedRedirect>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly model = signal<RedirectModel>({ projectId: '', from: '', to: '', statusCode: '308', keepPath: true });
  protected readonly redirect = form(this.model, (r) => {
    required(r.projectId, { error: { kind: 'project.notFound' } });
    hostname(r.from);
    serverCheck(r.from, 'redirects.check', ['from'], ({ value }) => ({ from: value() }));
    required(r.to, { error: { kind: 'redirect.targetInvalid' } });
    validate(r.to, ({ value, valueOf }) => {
      const kind = value().trim() ? checkTarget(value(), valueOf(r.from)) : undefined;
      return kind ? { kind } : undefined;
    });
  });
  protected readonly types = [
    ['308', 'Permanent', 'Search engines move to the new address. Keeps POST requests as POST.'],
    ['307', 'Temporary', 'Search engines keep the old address.'],
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
    const added = await apForm.submit(async () => {
      try {
        await this.api.send<string>('redirects.create', {
          projectId: value.projectId,
          from: value.from.trim(),
          to: value.to.trim(),
          statusCode: Number(value.statusCode),
          keepPath: value.keepPath,
        });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.redirect);
      }
    });
    if (added) {
      this.dialog.close({ from: value.from.trim().toLowerCase(), to: value.to.trim() });
    }
  }
}
