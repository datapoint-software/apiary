import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, Toaster, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { AgentPolicyView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';

const maximumOrigins = 20;

function lines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function isOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !url.username;
  } catch {
    return false;
  }
}

@Component({
  selector: 'ap-trusted-origins-panel',
  imports: [WriteLock, Form, Field, FormField, ErrorSummary, Button],
  template: `
    <form class="ap-panel" style="max-width: 760px" aria-labelledby="origins-title" [apForm]="policy" #policyForm="apForm" (submit)="save(policyForm)">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="origins-title">Web-based agents</h2>
          <p class="ap-panel-desc">
            Agents like Claude Code run on your own computer, and always can. An agent that runs on a website can only connect if
            its site is listed here, so nobody can send you a link that hands your access to a site of their own.
          </p>
        </div>
      </div>
      <div class="ap-panel-body ap-stack">
        <ap-error-summary verb="save them" />
        <ap-field
          label="Trusted sites"
          [field]="policy.origins"
          [optional]="true"
          help="One HTTPS address per line, without a path, such as https://agents.example.com. At most 20. Removing a site disconnects the agents that run there."
        >
          <textarea class="ap-textarea ap-data" rows="3" placeholder="https://agents.example.com" spellcheck="false" [formField]="policy.origins"></textarea>
        </ap-field>
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
export class TrustedOriginsPanel {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly current = httpResource<AgentPolicyView>(() => this.api.query('agents.policy'));
  private readonly model = signal({ origins: '' });
  protected readonly policy = form(this.model, (p) => {
    validate(p.origins, ({ value }) => (lines(value()).length > maximumOrigins ? { kind: 'agent.originsTooMany' } : undefined));
    validate(p.origins, ({ value }) => (lines(value()).every(isOrigin) ? undefined : { kind: 'agent.originInvalid' }));
  });

  constructor() {
    effect(() => {
      const current = this.current.value();
      if (current && !this.policy().dirty()) {
        this.model.set({ origins: current.trustedOrigins.join('\n') });
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    const trustedOrigins = lines(this.model().origins);
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('agents.update-policy', { trustedOrigins });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.policy);
      }
    });
    if (saved) {
      this.policy().reset();
      this.current.reload();
      this.toaster.show(
        trustedOrigins.length ? 'Agents can connect from the sites listed, and from people’s own computers.' : 'Agents can only connect from people’s own computers.',
        { heading: 'Saved' },
      );
    }
  }
}
