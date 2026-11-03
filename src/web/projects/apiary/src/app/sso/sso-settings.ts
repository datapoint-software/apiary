import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Banner, Button, ErrorSummary, Field, Form, PageHead, Toaster, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { SsoSettingsView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { CopyText } from '../auth/copy-text';
import { WriteLock } from '../cluster/write-lock';

interface SsoModel {
  enabled: boolean;
  displayName: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  groupsClaim: string;
  administratorGroups: string;
  operatorGroups: string;
  viewerGroups: string;
}

const lines = (groups: readonly string[]) => groups.join('\n');
const groups = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function ssoModel(view: SsoSettingsView): SsoModel {
  return {
    enabled: view.enabled,
    displayName: view.displayName,
    issuer: view.issuer,
    clientId: view.clientId,
    clientSecret: '',
    groupsClaim: view.groupsClaim,
    administratorGroups: lines(view.administratorGroups),
    operatorGroups: lines(view.operatorGroups),
    viewerGroups: lines(view.viewerGroups),
  };
}

@Component({
  selector: 'ap-sso-settings',
  imports: [WriteLock, PageHead, Banner, Button, ErrorSummary, Field, Form, FormField, CopyText],
  templateUrl: './sso-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SsoSettings {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  protected readonly current = httpResource<SsoSettingsView>(() => this.api.query('sso.get'));
  protected readonly redirectUri = `${location.origin}/auth/sso/callback`;
  protected readonly model = signal<SsoModel>({
    enabled: false,
    displayName: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    groupsClaim: 'groups',
    administratorGroups: '',
    operatorGroups: '',
    viewerGroups: '',
  });
  protected readonly settings = form(this.model, (p) => {
    required(p.displayName);
    required(p.issuer);
    required(p.clientId);
    required(p.groupsClaim);
  });
  protected readonly changed = computed(() => {
    const changedAt = this.current.value()?.changedAt;
    return changedAt ? `Changed ${timeAgo(changedAt)}` : 'Not set up yet';
  });

  constructor() {
    effect(() => {
      const view = this.current.value();
      if (view && !untracked(() => this.settings().dirty())) {
        this.model.set(ssoModel(view));
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    const saved = await apForm.submit(async () => {
      try {
        const value = this.model();
        await this.api.send('sso.update', {
          enabled: value.enabled,
          displayName: value.displayName.trim(),
          issuer: value.issuer.trim(),
          clientId: value.clientId.trim(),
          clientSecret: value.clientSecret || null,
          groupsClaim: value.groupsClaim.trim(),
          administratorGroups: groups(value.administratorGroups),
          operatorGroups: groups(value.operatorGroups),
          viewerGroups: groups(value.viewerGroups),
        });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.settings);
      }
    });
    if (saved) {
      this.settings().reset();
      this.current.reload();
      this.toaster.show(this.model().enabled ? 'Single sign-on saved. The sign-in page offers it now.' : 'Single sign-on saved. It’s off.');
    }
  }
}
