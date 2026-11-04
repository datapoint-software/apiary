import { DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { ApiProblem, Banner, Button, ErrorMessages, ErrorSummary, Field, Form, I18n, Icon, PasswordReveal, TranslatePipe, isApiProblem, problemErrors } from '@datapoint/apiary-ui';
import { TriangleAlert } from 'lucide';
import { Api } from '../api/api';
import { RecoveryPlan } from '../api/models';
import { utcDateTime } from '../api/time-ago';

interface RecoveryModel {
  node: string;
  password: string;
  code: string;
}

type Step = 'check' | 'confirm' | 'done';

@Component({
  selector: 'ap-recovery-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, Icon, Banner, PasswordReveal, TranslatePipe],
  templateUrl: './recovery-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryDialog {
  protected readonly dialog = inject(DialogRef);
  private readonly api = inject(Api);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly plan = httpResource<RecoveryPlan>(() => ({ ...this.api.query('cluster.recovery-plan'), timeout: 30_000 }));
  protected readonly lastPlan = linkedSignal<RecoveryPlan | undefined, RecoveryPlan | undefined>({
    source: () => (this.plan.hasValue() ? this.plan.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });
  protected readonly step = signal<Step>('check');
  protected readonly checks = signal([false, false, false]);
  protected readonly checked = computed(() => this.checks().every(Boolean));
  protected readonly failure = signal('');
  protected readonly alert = TriangleAlert;
  protected readonly utcDateTime = utcDateTime;
  protected readonly lost = computed(() => new Intl.ListFormat(this.i18n.language(), { type: 'conjunction' }).format(this.lastPlan()?.unreachable ?? []));
  protected readonly ahead = computed(() => {
    const plan = this.lastPlan();
    return plan?.survivors.find((s) => s.index > plan.index);
  });
  private readonly model = signal<RecoveryModel>({ node: '', password: '', code: '' });
  protected readonly confirmation = form(this.model, (m) => {
    required(m.node, { error: { kind: 'recovery.nodeRequired' } });
    validate(m.node, ({ value }) => (!value() || value().trim() === this.node() ? undefined : { kind: 'recovery.nodeMismatch' }));
    required(m.password, { error: { kind: 'required' } });
    required(m.code, { error: { kind: 'required' } });
  });

  protected node(): string {
    return this.lastPlan()?.node ?? '';
  }

  protected toggle(index: number, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.checks.update((checks) => checks.map((c, i) => (i === index ? on : c)));
  }

  protected async recover(apForm: Form): Promise<void> {
    this.failure.set('');
    const { node, password, code } = this.model();
    const sent = await apForm.submit(async () => {
      try {
        await this.api.send('cluster.recover', { node: node.trim(), password, code });
        return undefined;
      } catch (problem) {
        if (isApiProblem(problem) && problem.errors?.length) {
          return problemErrors(problem as ApiProblem, this.confirmation);
        }
        this.failure.set(this.messages.describe(isApiProblem(problem) ? problem.code : 'network.offline'));
        return undefined;
      }
    });
    if (sent && !this.failure()) {
      this.step.set('done');
    }
  }

  protected signIn(): void {
    location.assign('/sign-in');
  }
}
