import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, TranslatePipe, checkHostname, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { DnsProviderDetails, DnsProviderKind, DnsProviderSaveResult, DnsProviderTestView, DnsProviderView } from '../api/models';
import { CnameTable } from './cname-table';
import { ChallengeRecord, challengeName, nameLines } from './dns-names';
import { DnsProviderFields } from './dns-provider-fields';
import { SecretKey, dnsProviderKinds, secretOf, textSettingsOf } from './dns-provider-kinds';
import { DnsProviderModel, dnsProviderModel, dnsProviderRules } from './dns-provider-rules';

export interface DnsProviderDialogData {
  readonly details: DnsProviderDetails | null;
  readonly providers: readonly DnsProviderView[];
}

export interface SavedDnsProvider {
  readonly name: string;
  readonly added: boolean;
  readonly delegated: boolean;
  readonly record: string;
  readonly test: DnsProviderTestView;
}

export function providerBody(value: DnsProviderModel): Record<string, unknown> {
  const kind = value.kind;
  const delegated = value.where === 'delegate';
  const body: Record<string, unknown> = {
    name: value.name.trim(),
    kind,
    domains: nameLines(value.domains),
    challengeZone: delegated ? value.challengeZone.trim().toLowerCase() : null,
  };
  for (const key of textSettingsOf[kind]) {
    body[key] = value[key].trim();
  }
  if (kind === 'rfc2136') {
    body['port'] = value.port;
    body['algorithm'] = value.algorithm;
  }
  const secret = secretOf[kind];
  body[secret] = value[secret].trim() || null;
  return body;
}

@Component({
  selector: 'ap-dns-provider-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, CnameTable, DnsProviderFields, TranslatePipe],
  templateUrl: './dns-provider-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnsProviderDialog {
  protected readonly dialog = inject<DialogRef<SavedDnsProvider>>(DialogRef);
  private readonly data = inject<DnsProviderDialogData>(DIALOG_DATA);
  private readonly api = inject(Api);
  protected readonly existing = this.data.details?.provider ?? null;
  protected readonly kinds = dnsProviderKinds;
  private readonly others = this.data.providers.filter((p) => p.id !== this.existing?.id);
  protected readonly model = signal<DnsProviderModel>(dnsProviderModel(this.data.details));
  protected readonly provider = form(
    this.model,
    dnsProviderRules(
      () => this.others,
      (kind, key) => this.keeps(kind, key),
    ),
  );
  protected readonly secretKept = computed(() => {
    const kind = this.model().kind;
    return this.keeps(kind, secretOf[kind]);
  });
  protected readonly exampleHost = computed(() => {
    const [domain] = nameLines(this.model().domains);
    return domain ? `shop.${domain}` : '';
  });
  protected readonly example = computed<ChallengeRecord[]>(() => {
    const zone = this.model().challengeZone.trim().toLowerCase();
    const host = this.exampleHost();
    if (!host || !zone || checkHostname(zone) !== null) {
      return [];
    }
    return [{ name: challengeName(host), target: `${host}.${zone}` }];
  });

  private keeps(kind: DnsProviderKind, key: SecretKey): boolean {
    const details = this.data.details;
    return !!details && details.provider.kind === kind && details.secretsSet.includes(key);
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    let result: DnsProviderSaveResult | undefined;
    const saved = await apForm.submit(async () => {
      try {
        result = await this.persist(value);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.provider);
      }
    });
    if (saved && result) {
      const body = providerBody(value);
      const zone = body['challengeZone'] as string | null;
      this.dialog.close({
        name: body['name'] as string,
        added: !this.existing,
        delegated: !!zone,
        record: `_apiary-test.${zone ?? (body['domains'] as string[])[0]}`,
        test: result.test,
      });
    }
  }

  private persist(value: DnsProviderModel): Promise<DnsProviderSaveResult> {
    const body = providerBody(value);
    return this.existing
      ? this.api.send<DnsProviderSaveResult>('dns-providers.update', { id: this.existing.id, ...body })
      : this.api.send<DnsProviderSaveResult>('dns-providers.add', body);
  }
}
