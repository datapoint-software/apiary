import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, Toaster, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ProjectView, RouteView } from '../api/models';

@Component({
  selector: 'ap-move-routes-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button],
  template: `
    <form class="ap-dialog" role="dialog" aria-labelledby="move-title" [apForm]="move" #moveForm="apForm" (submit)="save(moveForm)">
      <div class="ap-dialog-head">
        <h2 class="ap-h ap-h-2" id="move-title">Move {{ count }}</h2>
      </div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <p style="margin: 0">Moving changes only where the routes are listed. Traffic isn’t affected.</p>
        <ap-error-summary verb="move them" />
        <ap-field label="Project" [field]="move.projectId">
          <select class="ap-select" [formField]="move.projectId" cdkFocusInitial>
            <option value="">Choose a project</option>
            @for (project of projects.value(); track project.id) {
              <option [value]="project.id">{{ project.name }}</option>
            }
          </select>
        </ap-field>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">Cancel</button>
        <button apButton="primary" type="submit" [disabled]="move().submitting()">{{ move().submitting() ? 'Moving…' : 'Move routes' }}</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveRoutesDialog {
  protected readonly dialog = inject<DialogRef<boolean>>(DialogRef);
  private readonly routes = inject<readonly RouteView[]>(DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly count = this.routes.length === 1 ? '1 route' : `${this.routes.length} routes`;
  private readonly model = signal({ projectId: '' });
  protected readonly move = form(this.model, (m) => {
    required(m.projectId, { error: { kind: 'project.notFound' } });
  });

  protected async save(apForm: Form): Promise<void> {
    const projectId = this.model().projectId;
    const name = this.projects.value().find((p) => p.id === projectId)?.name ?? 'the project';
    const moved = await apForm.submit(async () => {
      try {
        await this.api.send('routes.move', { ids: this.routes.map((r) => r.id), projectId });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.move);
      }
    });
    if (moved) {
      this.toaster.show(`${this.count} moved to ${name}.`);
      this.dialog.close(true);
    }
  }
}
