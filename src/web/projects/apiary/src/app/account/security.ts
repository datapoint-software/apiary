import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import {
  ApiProblem,
  Button,
  Confirmer,
  ErrorSummary,
  Field,
  Form,
  PageHead,
  PasswordChecklist,
  PasswordReveal,
  Status,
  Toaster,
  newPassword,
  problemErrors,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { TwoStepEnrollment } from '../api/models';
import { Auth } from '../auth/auth';
import { matchesPassword } from '../auth/repeat-password';
import { openDialog } from '../shell/open-dialog';
import { AccountTabs } from './account-tabs';
import { RecoveryCodesDialog } from './recovery-codes-dialog';
import { TwoStepDialog } from './two-step-dialog';

@Component({
  selector: 'ap-security',
  imports: [PageHead, AccountTabs, Form, Field, FormField, ErrorSummary, Button, PasswordReveal, PasswordChecklist, Status],
  templateUrl: './security.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Security {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  protected readonly auth = inject(Auth);
  protected readonly crumbs = [{ label: 'Your account', link: '/account' }];

  private readonly model = signal({ current: '', next: '', again: '' });
  protected readonly password = form(this.model, (p) => {
    required(p.current);
    newPassword(p.next, () => this.auth.user()?.email ?? '');
    matchesPassword(p.again, () => this.model().next);
  });
  protected readonly setUpOn = computed(() => this.auth.user()?.twoStepSetUpAt?.slice(0, 10) ?? '');

  protected async changePassword(apForm: Form): Promise<void> {
    let others = 0;
    const changed = await apForm.submit(async () => {
      try {
        others = await this.api.send<number>('account.change-password', { current: this.model().current, next: this.model().next });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.password);
      }
    });
    if (changed) {
      this.model.set({ current: '', next: '', again: '' });
      this.password().reset();
      apForm.attempted.set(false);
      const signedOut = others === 0 ? '' : ` Your ${others === 1 ? 'other session was' : `${others} other sessions were`} signed out.`;
      this.toaster.show(`You stay signed in here.${signedOut}`, { heading: 'Password changed' });
    }
  }

  protected async setUpAgain(): Promise<void> {
    const enrollment = await this.api.read<TwoStepEnrollment>('account.begin-two-step');
    if (await openDialog<boolean, TwoStepEnrollment>(this.dialog, TwoStepDialog, enrollment)) {
      await this.auth.load();
      this.toaster.show('Use the new entry in your app from now on, and delete the old one.', { heading: 'Two-step sign-in set up' });
    }
  }

  protected async newCodes(): Promise<void> {
    let codes: readonly string[] = [];
    const left = this.auth.user()?.recoveryCodesLeft ?? 0;
    const confirmed = await this.confirmer.confirm({
      heading: 'Make new recovery codes?',
      text: `Your ${left} remaining codes stop working, and you get 10 new ones. Store them somewhere safe, apart from your phone.`,
      confirm: 'Make new codes',
      busy: 'Making…',
      tone: 'primary',
      action: async () => {
        codes = await this.api.send<string[]>('account.new-recovery-codes');
      },
    });
    if (confirmed) {
      await this.auth.load();
      await openDialog<void, readonly string[]>(this.dialog, RecoveryCodesDialog, codes);
    }
  }
}
