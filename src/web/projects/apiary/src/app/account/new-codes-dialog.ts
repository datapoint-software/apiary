import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, PasswordReveal, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';

@Component({
  selector: 'ap-new-codes-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, PasswordReveal],
  template: `
    <form class="ap-dialog" role="dialog" aria-labelledby="new-codes-title" [apForm]="confirmation" #confirmForm="apForm" (submit)="make(confirmForm)">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="new-codes-title">Make new recovery codes?</h2></div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <ap-error-summary verb="make new codes" />
        <p style="margin: 0">
          Your {{ left }} remaining codes stop working, and you get 10 new ones. Store them somewhere safe, apart from your phone.
        </p>
        <ap-field label="Your password" [field]="confirmation.password">
          <div class="ap-affix">
            <input class="ap-input" type="password" #password [formField]="confirmation.password" autocomplete="current-password" cdkFocusInitial />
            <ap-password-reveal [target]="password" label="password" />
          </div>
        </ap-field>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">Cancel</button>
        <button apButton="primary" type="submit" [disabled]="confirmation().submitting()">
          {{ confirmation().submitting() ? 'Making…' : 'Make new codes' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewCodesDialog {
  protected readonly left = inject<number>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<readonly string[]>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly confirmation = form(signal({ password: '' }), (p) => required(p.password));

  protected async make(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const codes = await this.api.send<string[]>('account.new-recovery-codes', { password: this.confirmation.password().value() });
        this.dialog.close(codes);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.confirmation);
      }
    });
  }
}
