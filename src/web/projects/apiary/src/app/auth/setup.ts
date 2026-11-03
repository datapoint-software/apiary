import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  ApiProblem,
  Banner,
  Button,
  ErrorSummary,
  Field,
  Form,
  PasswordChecklist,
  PasswordReveal,
  ErrorMessages,
  Toaster,
  isApiProblem,
  newPassword,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { maximumBackupSize, restoreBackup } from '../backups/backup-files';
import { SetupStatus, TwoStepEnrollment } from '../api/models';
import { Auth } from './auth';
import { AuthPage } from './auth-page';
import { RecoveryCodes } from './recovery-codes';
import { matchesPassword } from './repeat-password';
import { TwoStepSetup } from './two-step-setup';

type Step = 'details' | 'enroll' | 'codes';

@Component({
  selector: 'ap-setup',
  imports: [
    AuthPage,
    Form,
    Field,
    FormField,
    ErrorSummary,
    Button,
    Banner,
    PasswordReveal,
    PasswordChecklist,
    TwoStepSetup,
    RecoveryCodes,
    RouterLink,
  ],
  templateUrl: './setup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Setup {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);

  protected readonly status = httpResource<SetupStatus>(() => ({ url: '/api/setup/status', method: 'POST', body: {} }));
  protected readonly closesAt = computed(() => {
    const closesAt = this.status.value()?.closesAt;
    return closesAt ? new Date(closesAt).toISOString().slice(11, 16) : '';
  });
  protected readonly step = signal<Step>('details');
  protected readonly enrollment = signal<TwoStepEnrollment | null>(null);
  protected readonly codes = signal<readonly string[]>([]);
  protected readonly restoring = signal(false);
  protected readonly restoreFailure = signal('');
  private readonly messages = inject(ErrorMessages);

  protected async restore(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.restoreFailure.set('');
    if (file.size > maximumBackupSize) {
      this.restoreFailure.set(this.messages.describe('backup.unreadable'));
      return;
    }
    this.restoring.set(true);
    try {
      const restored = await restoreBackup(this.api, 'setup.restore', await file.text());
      this.toaster.show(`${restored.users} users, ${restored.routes} routes and ${restored.certificates} certificates are back. Sign in as before.`, {
        heading: 'Backup restored',
      });
      await this.router.navigate(['/sign-in']);
    } catch (error) {
      this.restoreFailure.set(this.messages.describe(isApiProblem(error) ? error.code : 'network.offline'));
    } finally {
      this.restoring.set(false);
    }
  }

  private readonly model = signal({ name: '', email: '', password: '', again: '' });
  protected readonly details = form(this.model, (p) => {
    required(p.name);
    required(p.email);
    newPassword(p.password, () => this.model().email);
    matchesPassword(p.again, () => this.model().password);
  });
  protected readonly code = form(signal({ code: '' }), (p) => required(p.code));

  protected async begin(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const { name, email, password } = this.model();
        this.enrollment.set(await this.api.read<TwoStepEnrollment>('setup.begin', { name, email, password }));
        this.step.set('enroll');
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.details);
      }
    });
  }

  protected async complete(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const { name, email, password } = this.model();
        const body = { name, email, password, challenge: this.enrollment()?.challenge, code: this.code.code().value() };
        this.codes.set(await this.api.send<string[]>('setup.complete', body));
        this.step.set('codes');
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.code);
      }
    });
  }

  protected async finish(): Promise<void> {
    await this.auth.load();
    await this.router.navigateByUrl('/');
    this.toaster.show('Next, invite the people who run Apiary with you, in Users.', { heading: 'You’re the first administrator' });
  }
}
