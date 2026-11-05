import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import {
  ApiProblem,
  Button,
  ErrorSummary,
  Field,
  Form,
  TranslatePipe,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { NewPipelineToken } from '../api/models';
import { tokenDays } from './stack-text';

@Component({
  selector: 'ap-token-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  template: `
    <form
      class="ap-dialog"
      role="dialog"
      aria-labelledby="new-token-title"
      [apForm]="token"
      #tokenForm="apForm"
      (submit)="create(tokenForm)"
    >
      <div class="ap-dialog-head">
        <h2 class="ap-h ap-h-2" id="new-token-title">
          {{ 'Create a pipeline token for {stack}' | t: { stack } }}
        </h2>
      </div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <ap-error-summary verb="create the token" />
        <ap-field
          [label]="'Name' | t"
          [field]="token.name"
          [help]="'Shown in the audit log for every apply, so name the pipeline that uses it.' | t"
        >
          <input
            class="ap-input ap-data"
            [formField]="token.name"
            [placeholder]="stack + '-deploy'"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="none"
            cdkFocusInitial
          />
        </ap-field>
        <div style="max-width: 280px">
          <ap-field
            [label]="'Expires after' | t"
            [field]="token.days"
            [help]="'Create a new one before it expires, and update the CI variable.' | t"
          >
            <select class="ap-select" [formField]="token.days">
              @for (option of days; track option[0]) {
                <option [value]="option[0]">{{ option[1] | t }}</option>
              }
            </select>
          </ap-field>
        </div>
        <p class="ap-caption" style="margin: 0">
          {{
            'It can only apply {stack}: it can’t change other stacks, routes not from a stack, users or settings.'
              | t: { stack }
          }}
        </p>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">{{ 'Cancel' | t }}</button>
        <button apButton="primary" type="submit" [disabled]="token().submitting()">
          {{ (token().submitting() ? 'Creating…' : 'Create token') | t }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenDialog {
  protected readonly stack = inject<string>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<NewPipelineToken>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly days = tokenDays;
  private readonly model = signal({ name: `${this.stack}-deploy`, days: '90' });
  protected readonly token = form(this.model, (p) => {
    required(p.name);
  });

  protected async create(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const value = this.model();
        const created = await this.api.send<NewPipelineToken>('pipeline-tokens.create', {
          stack: this.stack,
          name: value.name.trim(),
          days: Number(value.days),
        });
        this.dialog.close(created);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.token);
      }
    });
  }
}
