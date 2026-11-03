import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, Toaster, problemErrors, wholeNumber } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { SessionPolicyView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-session-policy-panel',
  imports: [WriteLock, Form, Field, FormField, ErrorSummary, Button],
  template: `
    <form class="ap-panel" aria-labelledby="session-policy-title" [apForm]="policy" #policyForm="apForm" (submit)="save(policyForm)">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="session-policy-title">Signing out</h2>
          <p class="ap-panel-desc">
            People are signed out after this long without using Apiary, and after 12 hours in any case. Pages left open don’t count as use.
            Connected agents aren’t affected.
          </p>
        </div>
      </div>
      <div class="ap-panel-body ap-stack">
        <ap-error-summary verb="save it" />
        <div style="max-width: 300px">
          <ap-field label="Sign out after" [field]="policy.idleMinutes" help="From 5 to 720 minutes without activity.">
            <div class="ap-affix">
              <input class="ap-input ap-data" type="number" inputmode="numeric" [formField]="policy.idleMinutes" />
              <span class="ap-affix-text">minutes</span>
            </div>
          </ap-field>
        </div>
      </div>
      <div class="ap-panel-foot ap-row" style="justify-content: flex-end">
        <button apWrite apButton="primary" type="submit" [disabled]="policy().submitting()">
          {{ policy().submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionPolicyPanel {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly current = httpResource<SessionPolicyView>(() => this.api.query('users.session-policy'));
  private readonly model = signal<SessionPolicyView>({ idleMinutes: 15 });
  protected readonly policy = form(this.model, (p) => {
    wholeNumber(p.idleMinutes, 5, 720);
  });

  constructor() {
    effect(() => {
      const current = this.current.value();
      if (current && !this.policy().dirty()) {
        this.model.set(current);
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('users.update-session-policy', value);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.policy);
      }
    });
    if (saved) {
      this.policy().reset();
      this.current.reload();
      this.toaster.show(`People are signed out after ${value.idleMinutes} minutes without activity.`, { heading: 'Saved' });
    }
  }
}
