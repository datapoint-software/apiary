import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, I18n, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';

@Component({
  selector: 'ap-delete-project-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  templateUrl: './delete-project-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteProjectDialog {
  protected readonly dialog = inject<DialogRef<ProjectView>>(DialogRef);
  protected readonly project = inject<ProjectView>(DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly others = computed(() => this.projects.value().filter((p) => p.id !== this.project.id));
  protected readonly contents = computed(() => {
    const parts = [
      [this.project.routeCount, '{count} route', '{count} routes'],
      [this.project.redirectCount, '{count} redirect', '{count} redirects'],
      [this.project.streamCount, '{count} stream route', '{count} stream routes'],
      [this.project.certificateCount, '{count} uploaded certificate', '{count} uploaded certificates'],
    ] as const;
    return parts
      .filter(([count]) => count > 0)
      .map(([count, one, many]) => this.i18n.plural(count, one, many))
      .join(', ');
  });
  private readonly model = signal({ moveTo: '' });
  protected readonly move = form(this.model, (m) => {
    required(m.moveTo, { error: { kind: 'project.chooseDestination' } });
  });

  protected async delete(apForm: Form): Promise<void> {
    const moveTo = this.model().moveTo;
    const destination = this.others().find((p) => p.id === moveTo);
    const deleted = await apForm.submit(async () => {
      try {
        await this.api.send('projects.delete', { id: this.project.id, moveTo });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.move);
      }
    });
    if (deleted) {
      this.dialog.close(destination);
    }
  }
}
