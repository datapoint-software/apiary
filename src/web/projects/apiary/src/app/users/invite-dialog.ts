import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { InviteLink, Role } from '../api/models';
import { RoleChoices } from './role-choices';

@Component({
  selector: 'ap-invite-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, RoleChoices],
  template: `
    <form class="ap-dialog" role="dialog" aria-labelledby="invite-title" [apForm]="invite" #inviteForm="apForm" (submit)="create(inviteForm)">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="invite-title">Invite someone</h2></div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <ap-error-summary verb="create the invite" />
        <ap-field label="Name" [field]="invite.name">
          <input class="ap-input" [formField]="invite.name" autocomplete="off" cdkFocusInitial />
        </ap-field>
        <ap-field label="Email" [field]="invite.email" help="Their sign-in name. Apiary doesn’t send email: you share the invite link.">
          <input class="ap-input" type="email" [formField]="invite.email" autocomplete="off" spellcheck="false" autocapitalize="none" />
        </ap-field>
        <ap-role-choices [field]="invite.role" />
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">Cancel</button>
        <button apButton="primary" type="submit" [disabled]="invite().submitting()">
          {{ invite().submitting() ? 'Creating…' : 'Create invite' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteDialog {
  protected readonly dialog = inject<DialogRef<{ link: InviteLink; email: string; name: string }>>(DialogRef);
  private readonly api = inject(Api);
  private readonly model = signal<{ name: string; email: string; role: Role }>({ name: '', email: '', role: 'viewer' });
  protected readonly invite = form(this.model, (p) => {
    required(p.name);
    required(p.email);
  });

  protected async create(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const link = await this.api.send<InviteLink>('users.invite', this.model());
        this.dialog.close({ link, email: this.model().email.trim(), name: this.model().name.trim() });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.invite);
      }
    });
  }
}
