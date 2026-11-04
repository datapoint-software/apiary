import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import {
  ApiProblem,
  Banner,
  Button,
  ErrorMessages,
  ErrorSummary,
  Field,
  Form,
  I18n,
  PasswordReveal,
  Toaster,
  TranslatePipe,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { SignInOptions, SignInStep } from '../api/models';
import { Auth } from './auth';
import { AuthPage } from './auth-page';
import { RecoveryCodes } from './recovery-codes';
import { TwoStepSetup } from './two-step-setup';

const orEmpty = (value: string | undefined) => value ?? '';

type Step = 'password' | 'code' | 'enroll' | 'codes';

@Component({
  selector: 'ap-sign-in',
  imports: [AuthPage, Banner, Form, Field, FormField, ErrorSummary, Button, PasswordReveal, TwoStepSetup, RecoveryCodes, TranslatePipe],
  templateUrl: './sign-in.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  readonly next = input('', { transform: orEmpty });
  readonly error = input('', { transform: orEmpty });
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);

  protected readonly options = httpResource<SignInOptions>(() => this.api.query('auth.options'));
  protected readonly ssoError = computed(() => (this.error() ? this.messages.describe(this.error()) : ''));
  protected readonly ssoLink = computed(() => {
    const next = this.next().startsWith('/') ? this.next() : '/';
    return `/auth/sso/start?next=${encodeURIComponent(next)}`;
  });

  protected readonly step = signal<Step>('password');
  protected readonly signInStep = signal<SignInStep | null>(null);
  protected readonly recovery = signal(false);
  protected readonly codes = signal<readonly string[]>([]);

  protected readonly credentials = form(signal({ email: '', password: '' }), (p) => {
    required(p.email);
    required(p.password);
  });

  protected readonly code = form(signal({ code: '' }), (p) => {
    validate(p.code, ({ value }) => {
      const code = value().trim();
      if (this.recovery()) {
        return code ? undefined : { kind: 'required' };
      }
      return /^\d{6}$/.test(code.replace(/\s/g, '')) ? undefined : { kind: 'code.format' };
    });
  });

  protected async signIn(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const step = await this.api.read<SignInStep>('auth.sign-in', this.credentials().value());
        this.signInStep.set(step);
        this.step.set(step.next);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.credentials);
      }
    });
  }

  protected async verify(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const result = await this.api.send<{ recoveryCodes?: string[] }>('auth.verify', {
          challenge: this.signInStep()?.challenge,
          code: this.code.code().value(),
        });
        if (result.recoveryCodes?.length) {
          this.codes.set(result.recoveryCodes);
          this.step.set('codes');
          return undefined;
        }
        await this.enter();
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.code);
      }
    });
  }

  protected toggleRecovery(): void {
    this.recovery.update((r) => !r);
    this.code.code().value.set('');
  }

  protected back(): void {
    this.step.set('password');
    this.recovery.set(false);
    this.code.code().value.set('');
  }

  protected async enter(): Promise<void> {
    const user = await this.auth.load();
    await this.router.navigateByUrl(this.next().startsWith('/') ? this.next() : '/');
    this.toaster.show(this.i18n.t('Welcome back, {name}.', { name: user?.name.split(' ')[0] ?? '' }));
  }
}
