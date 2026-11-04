import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { ApiProblem, Banner, Button, ErrorSummary, Field, Form, I18n, PageHead, Toaster, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { Auth } from '../auth/auth';
import { roleNames } from '../auth/roles';
import { AccountTabs } from './account-tabs';

@Component({
  selector: 'ap-profile',
  imports: [PageHead, AccountTabs, Banner, Form, Field, FormField, ErrorSummary, Button, TranslatePipe],
  template: `
    <ap-page-head [heading]="'Your account' | t" />
    <ap-account-tabs />
    @if (managed()) {
      <ap-banner tone="info" [heading]="'Your identity provider manages your account' | t" style="max-width: 640px">{{
        'Change your name, email and groups there. Apiary updates them, and your role, each time you sign in.' | t
      }}</ap-banner>
    }
    <form class="ap-panel" style="max-width: 640px" aria-labelledby="profile-title" [apForm]="profile" #profileForm="apForm" (submit)="save(profileForm)">
      <div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="profile-title">{{ 'Profile' | t }}</h2></div>
      <div class="ap-panel-body ap-stack">
        <ap-error-summary verb="save your profile" />
        <ap-field [label]="'Name' | t" [field]="profile.name">
          <input class="ap-input" [formField]="profile.name" autocomplete="name" />
        </ap-field>
        <ap-field [label]="'Email' | t" [field]="profile.email" [help]="'You sign in with it.' | t">
          <input class="ap-input" type="email" [formField]="profile.email" autocomplete="email" spellcheck="false" autocapitalize="none" />
        </ap-field>
        <dl class="ap-kv">
          <dt>{{ 'Role' | t }}</dt>
          <dd>{{ role() | t }}. {{ (managed() ? 'It comes from your groups at the identity provider.' : 'Another administrator can change it.') | t }}</dd>
          <dt>{{ 'Time zone' | t }}</dt>
          <dd>{{ 'Apiary shows every time in UTC, so everyone on call reads the same times.' | t }}</dd>
        </dl>
      </div>
      @if (!managed()) {
        <div class="ap-panel-foot ap-row" style="justify-content: flex-end">
          <button apButton="primary" type="submit" [disabled]="profile().submitting()">{{ (profile().submitting() ? 'Saving…' : 'Save profile') | t }}</button>
        </div>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  private readonly model = signal({ name: '', email: '' });
  protected readonly managed = () => this.auth.user()?.singleSignOn ?? false;
  protected readonly profile = form(this.model, (p) => {
    required(p.name);
    required(p.email);
    disabled(p, () => this.managed());
  });
  protected readonly role = () => roleNames[this.auth.user()?.role ?? 'viewer'];

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user && !this.profile().dirty()) {
        this.model.set({ name: user.name, email: user.email });
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('account.update-profile', this.model());
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.profile);
      }
    });
    if (saved) {
      this.profile().reset();
      await this.auth.load();
      this.toaster.show(this.i18n.t('Profile saved.'));
    }
  }
}
