import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Form, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { Role, UserView } from '../api/models';
import { RoleChoices } from './role-choices';

@Component({
  selector: 'ap-role-dialog',
  imports: [Form, ErrorSummary, Button, RoleChoices, TranslatePipe],
  template: `
    <form class="ap-dialog" role="dialog" aria-labelledby="role-title" [apForm]="change" #roleForm="apForm" (submit)="save(roleForm)">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="role-title">{{ 'Change the role of {name}' | t: { name: user.name } }}</h2></div>
      <div class="ap-dialog-body ap-form">
        <ap-error-summary verb="change the role" />
        <ap-role-choices [field]="change.role" />
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">{{ 'Cancel' | t }}</button>
        <button apButton="primary" type="submit" [disabled]="change().submitting()">
          {{ (change().submitting() ? 'Changing…' : 'Change role') | t }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDialog {
  protected readonly user = inject<UserView>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<Role>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly change = form(signal<{ role: Role }>({ role: this.user.role }));

  protected async save(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const role = this.change.role().value();
        await this.api.send('users.change-role', { id: this.user.id, role });
        this.dialog.close(role);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.change);
      }
    });
  }
}
