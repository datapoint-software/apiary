import { ChangeDetectionStrategy, Component, inject, input, resource, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  ApiProblem,
  Banner,
  Button,
  ErrorMessages,
  ErrorSummary,
  Field,
  Form,
  PasswordChecklist,
  PasswordReveal,
  Toaster,
  TranslatePipe,
  I18n,
  newPassword,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { InviteView } from '../api/models';
import { Auth } from './auth';
import { AuthPage } from './auth-page';
import { RecoveryCodes } from './recovery-codes';
import { matchesPassword } from './repeat-password';
import { TwoStepSetup } from './two-step-setup';

@Component({
  selector: 'ap-accept-invite',
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
    TranslatePipe,
  ],
  templateUrl: './accept-invite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvite {
  readonly token = input.required<string>();
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly messages = inject(ErrorMessages);

  protected readonly invite = resource({
    params: () => ({ token: this.token() }),
    loader: ({ params }) => this.api.read<InviteView>('invites.get', params),
  });
  protected readonly codes = signal<readonly string[]>([]);

  private readonly model = signal({ password: '', again: '', code: '' });
  protected readonly account = form(this.model, (p) => {
    newPassword(p.password, () => this.invite.value()?.email ?? '');
    matchesPassword(p.again, () => this.model().password);
    required(p.code);
  });

  protected async accept(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const { password, code } = this.model();
        const challenge = this.invite.value()?.enrollment.challenge;
        this.codes.set(await this.api.send<string[]>('invites.accept', { token: this.token(), password, challenge, code }));
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.account);
      }
    });
  }

  protected async finish(): Promise<void> {
    const user = await this.auth.load();
    await this.router.navigateByUrl('/');
    this.toaster.show(this.i18n.t('Welcome to Apiary, {name}.', { name: user?.name.split(' ')[0] ?? '' }));
  }
}
