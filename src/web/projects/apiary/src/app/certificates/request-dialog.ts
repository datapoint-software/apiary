import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ApiProblem, Banner, Button, ErrorSummary, Field, FieldHelp, Form, I18n, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { DnsProviderView, ProjectView } from '../api/models';
import { CnameTable } from '../dns-providers/cname-table';
import { bestProvider, challengeRecords, nameLines, providersFor } from '../dns-providers/dns-names';
import { shortKind } from '../dns-providers/dns-provider-kinds';
import { RequestModel, requestRules } from './request-rules';

export interface RequestDialogData {
  readonly providers: readonly DnsProviderView[];
  readonly canAdminister: boolean;
}

interface ProviderOption {
  readonly id: string;
  readonly label: string;
}

function providerLabel(provider: DnsProviderView): string {
  const short = shortKind(provider.kind);
  return provider.name === short ? provider.name : `${provider.name} (${short})`;
}

@Component({
  selector: 'ap-request-dialog',
  imports: [Form, Field, FieldHelp, FormField, ErrorSummary, Banner, Button, CnameTable, RouterLink, TranslatePipe],
  templateUrl: './request-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDialog {
  protected readonly dialog = inject<DialogRef<string>>(DialogRef);
  protected readonly data = inject<RequestDialogData>(DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly model = signal<RequestModel>({
    names: '',
    challenge: this.data.providers.length > 0 ? 'dns' : 'http',
    dnsProviderId: '',
    projectId: '',
  });
  protected readonly request = form(
    this.model,
    requestRules(
      () => this.data.providers,
      () => this.data.canAdminister,
    ),
  );
  private readonly names = computed(() => nameLines(this.model().names), { equal: (a, b) => a.join() === b.join() });
  private readonly candidates = computed(() => providersFor(this.data.providers, this.names()));
  protected readonly options = computed<ProviderOption[]>(() => {
    const candidates = this.candidates();
    const first = candidates.length ? this.i18n.t('Choose a provider') : this.i18n.t('No provider proves these names');
    return [{ id: '', label: first }, ...candidates.map((p) => ({ id: p.id, label: providerLabel(p) }))];
  });
  protected readonly chosen = computed(() => {
    const value = this.model();
    return value.challenge === 'dns' ? this.data.providers.find((p) => p.id === value.dnsProviderId) : undefined;
  });
  protected readonly records = computed(() => challengeRecords(this.chosen(), this.names()));
  protected readonly delegatedProvider = computed(() => (this.records().length > 0 ? this.chosen() : undefined));
  protected readonly placeholder = '*.example.com\nexample.com';

  constructor() {
    effect(() => {
      const names = this.names();
      const candidates = this.candidates();
      const current = untracked(() => this.model().dnsProviderId);
      const suggested = bestProvider(this.data.providers, names)?.id ?? '';
      if (!candidates.some((p) => p.id === current) && suggested !== current) {
        this.model.update((m) => ({ ...m, dnsProviderId: suggested }));
      }
    });
    effect(() => {
      const projects = this.projects.value();
      if (!untracked(() => this.model().projectId) && projects.length > 0) {
        this.model.update((m) => ({ ...m, projectId: projects[0].id }));
      }
    });
  }

  protected async submit(apForm: Form): Promise<void> {
    const value = this.model();
    let id = '';
    const requested = await apForm.submit(async () => {
      try {
        id = await this.api.send<string>('certificates.request', {
          names: nameLines(value.names),
          dnsProviderId: value.challenge === 'dns' ? value.dnsProviderId : null,
          projectId: value.projectId || null,
        });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.request);
      }
    });
    if (requested) {
      this.dialog.close(id);
    }
  }
}
