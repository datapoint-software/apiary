import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, PasswordReveal, TranslatePipe, problemErrors, sixDigitCode } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { TwoStepEnrollment } from '../api/models';
import { TwoStepSetup } from '../auth/two-step-setup';

@Component({
  selector: 'ap-two-step-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, PasswordReveal, TwoStepSetup, TranslatePipe],
  template: `
    <form class="ap-dialog" role="dialog" aria-labelledby="totp-title" [apForm]="code" #codeForm="apForm" (submit)="confirm(codeForm)">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="totp-title">{{ 'Set up two-step sign-in again' | t }}</h2></div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <ap-error-summary verb="turn it on" />
        <ap-two-step-setup [enrollment]="enrollment" />
        <p class="ap-caption" style="margin: 0">{{ 'Your current setup keeps working until you finish.' | t }}</p>
        <ap-field [label]="'Code from the app' | t" [field]="code.code">
          <input class="ap-input ap-otp" [formField]="code.code" inputmode="numeric" autocomplete="one-time-code" cdkFocusInitial />
        </ap-field>
        <ap-field [label]="'Your password' | t" [field]="code.password">
          <div class="ap-affix">
            <input class="ap-input" type="password" #password [formField]="code.password" autocomplete="current-password" />
            <ap-password-reveal [target]="password" [label]="'password' | t" />
          </div>
        </ap-field>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">{{ 'Cancel' | t }}</button>
        <button apButton="primary" type="submit" [disabled]="code().submitting()">{{ (code().submitting() ? 'Checking…' : 'Turn on') | t }}</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoStepDialog {
  protected readonly enrollment = inject<TwoStepEnrollment>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly code = form(signal({ code: '', password: '' }), (p) => {
    sixDigitCode(p.code);
    required(p.password);
  });

  protected async confirm(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        await this.api.send('account.confirm-two-step', {
          challenge: this.enrollment.challenge,
          code: this.code.code().value(),
          password: this.code.password().value(),
        });
        this.dialog.close(true);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.code);
      }
    });
  }
}
