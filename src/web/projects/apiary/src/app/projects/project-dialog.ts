import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, Icon, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { serverCheck } from '../api/server-check';
import { ProjectView } from '../api/models';
import { projectIcons } from '../shell/project-icons';

export interface SavedProject {
  readonly id: string;
  readonly name: string;
}

interface ProjectModel {
  name: string;
  description: string;
  icon: string;
}

function tooLong(value: string, max: number) {
  return value.trim().length > max ? { kind: 'tooLong', params: { max } } : undefined;
}

@Component({
  selector: 'ap-project-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, Icon, TranslatePipe],
  templateUrl: './project-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDialog {
  protected readonly dialog = inject<DialogRef<SavedProject>>(DialogRef);
  protected readonly existing = inject<ProjectView | null>(DIALOG_DATA);
  private readonly api = inject(Api);
  protected readonly icons = Object.entries(projectIcons).map(([name, icon]) => ({ name, icon, label: name.replaceAll('-', ' ') }));
  private readonly model = signal<ProjectModel>({
    name: this.existing?.name ?? '',
    description: this.existing?.description ?? '',
    icon: this.existing?.icon ?? 'globe',
  });
  protected readonly project = form(this.model, (p) => {
    required(p.name);
    validate(p.name, ({ value }) => tooLong(value(), 40));
    serverCheck(p.name, 'projects.check', ['name'], ({ value }) => ({ name: value(), id: this.existing?.id ?? null }));
    validate(p.description, ({ value }) => tooLong(value(), 120));
  });

  protected submitLabel(): string {
    if (this.project().submitting()) {
      return 'Saving…';
    }
    return this.existing ? 'Save project' : 'Create project';
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const body = { name: value.name.trim(), description: value.description.trim(), icon: value.icon };
    let id = this.existing?.id ?? '';
    const saved = await apForm.submit(async () => {
      try {
        if (this.existing) {
          await this.api.send('projects.update', { id, ...body });
        } else {
          id = await this.api.send<string>('projects.create', body);
        }
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.project);
      }
    });
    if (saved) {
      this.dialog.close({ id, name: body.name });
    }
  }
}
