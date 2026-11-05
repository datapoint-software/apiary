import { DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
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
import { NewPipelineToken, ProjectView } from '../api/models';
import { isStackName, tokenDays } from './stack-text';

@Component({
  selector: 'ap-add-stack-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  template: `
    <form
      class="ap-dialog"
      role="dialog"
      aria-labelledby="add-stack-title"
      [apForm]="stack"
      #stackForm="apForm"
      (submit)="add(stackForm)"
    >
      <div class="ap-dialog-head">
        <h2 class="ap-h ap-h-2" id="add-stack-title">{{ 'Add a stack' | t }}</h2>
      </div>
      <div class="ap-dialog-body ap-form" style="gap: 16px">
        <ap-error-summary verb="add the stack" />
        <ap-field
          [label]="'Stack name' | t"
          [field]="stack.name"
          [help]="'The name your pipeline gives docker stack deploy, such as shop.' | t"
        >
          <input
            class="ap-input ap-data"
            [formField]="stack.name"
            placeholder="shop"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="none"
            cdkFocusInitial
            (input)="nameToken()"
          />
        </ap-field>
        <ap-field
          [label]="'Project' | t"
          [field]="stack.projectId"
          [optional]="true"
          [help]="'Where its routes go when their labels don’t name a project.' | t"
        >
          <select class="ap-select" [formField]="stack.projectId">
            <option value="">{{ 'Set by the apiary.project label' | t }}</option>
            @for (project of projects.value(); track project.id) {
              <option [value]="project.id">{{ project.name }}</option>
            }
          </select>
        </ap-field>
        <ap-field
          [label]="'Token name' | t"
          [field]="stack.tokenName"
          [help]="
            'For the stack’s first pipeline token. It appears in the audit log for every apply, so name the pipeline that uses it.'
              | t
          "
        >
          <input
            class="ap-input ap-data"
            [formField]="stack.tokenName"
            placeholder="shop-deploy"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="none"
            (input)="tokenNamed = true"
          />
        </ap-field>
        <div style="max-width: 280px">
          <ap-field [label]="'Token expires after' | t" [field]="stack.tokenDays">
            <select class="ap-select" [formField]="stack.tokenDays">
              @for (option of days; track option[0]) {
                <option [value]="option[0]">{{ option[1] | t }}</option>
              }
            </select>
          </ap-field>
        </div>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="ghost" type="button" (click)="dialog.close()">{{ 'Cancel' | t }}</button>
        <button apButton="primary" type="submit" [disabled]="stack().submitting()">
          {{ (stack().submitting() ? 'Adding…' : 'Add stack') | t }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddStackDialog {
  protected readonly dialog = inject<DialogRef<NewPipelineToken>>(DialogRef);
  private readonly api = inject(Api);
  protected readonly days = tokenDays;
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), {
    defaultValue: [],
  });
  protected tokenNamed = false;
  private readonly model = signal({ name: '', projectId: '', tokenName: '', tokenDays: '90' });
  protected readonly stack = form(this.model, (p) => {
    required(p.name);
    validate(p.name, ({ value }) =>
      !value().trim() || isStackName(value().trim()) ? undefined : { kind: 'stack.nameInvalid' },
    );
    required(p.tokenName);
  });

  protected nameToken(): void {
    if (this.tokenNamed) {
      return;
    }
    const name = this.model().name.trim();
    this.model.update((m) => ({ ...m, tokenName: name ? `${name}-deploy` : '' }));
  }

  protected async add(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const value = this.model();
        const created = await this.api.send<NewPipelineToken>('stacks.add', {
          name: value.name.trim(),
          tokenName: value.tokenName.trim(),
          projectId: value.projectId || null,
          tokenDays: Number(value.tokenDays),
        });
        this.dialog.close(created);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.stack);
      }
    });
  }
}
