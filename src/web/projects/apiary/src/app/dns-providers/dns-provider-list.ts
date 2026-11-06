import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Banner, Button, Confirmer, EmptyState, ErrorMessages, I18n, Icon, PageHead, Toaster, TranslatePipe, isApiProblem } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { DnsProviderDetails, DnsProviderTestView, DnsProviderView } from '../api/models';
import { reloadEvery } from '../api/reload-every';
import { timeAgo, utcDateTime } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { isFailing, testRecord } from './dns-names';
import { DnsProviderDialog, DnsProviderDialogData, SavedDnsProvider } from './dns-provider-dialog';
import { shortKind } from './dns-provider-kinds';
import { DnsProviderRow, DnsProviderTable } from './dns-provider-table';

@Component({
  selector: 'ap-dns-provider-list',
  imports: [WriteLock, PageHead, Banner, EmptyState, Icon, Button, DnsProviderTable, TranslatePipe],
  templateUrl: './dns-provider-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnsProviderList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly addIcon = Plus;
  protected readonly crumbs = computed(() => [{ label: this.i18n.t('Certificates'), link: '/certificates' }]);
  protected readonly providers = httpResource<DnsProviderView[]>(() => this.api.query('dns-providers.list'), { defaultValue: [] });
  private readonly refresh = reloadEvery(this.providers);
  protected readonly isLoading = computed(() => this.providers.isLoading() && this.providers.value().length === 0);
  protected readonly failing = computed(() => this.providers.value().filter(isFailing));
  protected readonly testing = signal<string | null>(null);
  protected readonly emptyText = computed(() =>
    this.auth.canAdminister()
      ? this.i18n.t('Add one to get wildcards, and certificates for hostnames Let’s Encrypt can’t reach on port 80.')
      : this.i18n.t('An Administrator adds them. Until then, certificates are checked with a file on port 80.'),
  );
  protected readonly rows = computed<DnsProviderRow[]>(() => {
    const now = Date.now();
    return this.providers.value().map((provider) => ({
      provider,
      kind: shortKind(provider.kind),
      changed: this.changed(provider, now),
      ...this.testCells(provider.lastTest),
    }));
  });

  protected describe(code: string | undefined): string {
    return this.messages.describe(code ?? 'internal');
  }

  private changed(provider: DnsProviderView, now: number): string {
    const time = timeAgo(provider.changedAt, now);
    return provider.changedBy ? this.i18n.t('Changed {time} by {name}', { time, name: provider.changedBy }) : this.i18n.t('Changed {time}', { time });
  }

  private testCells(test: DnsProviderTestView | undefined): Pick<DnsProviderRow, 'testTone' | 'testText' | 'testCaption'> {
    if (!test) {
      return { testTone: 'info', testText: this.i18n.t('Not tested yet'), testCaption: '' };
    }
    const date = utcDateTime(test.at);
    return test.succeeded
      ? { testTone: 'ok', testText: this.i18n.t('Works'), testCaption: this.i18n.t('Tested {date} UTC', { date }) }
      : { testTone: 'critical', testText: this.i18n.t('Failing'), testCaption: this.i18n.t('Since {date} UTC', { date }) };
  }

  protected async edit(provider: DnsProviderView | null): Promise<void> {
    const details = provider ? await this.details(provider) : null;
    if (provider && !details) {
      return;
    }
    const data: DnsProviderDialogData = { details, providers: this.providers.value() };
    const saved = await openDialog<SavedDnsProvider, DnsProviderDialogData>(this.dialog, DnsProviderDialog, data);
    if (saved) {
      this.announceSaved(saved);
    }
  }

  private async details(provider: DnsProviderView): Promise<DnsProviderDetails | null> {
    try {
      return await this.api.read<DnsProviderDetails>('dns-providers.get', { id: provider.id });
    } catch (problem) {
      this.toaster.show(this.describe(isApiProblem(problem) ? problem.code : undefined), { tone: 'error' });
      return null;
    }
  }

  private announceSaved(saved: SavedDnsProvider): void {
    if (!saved.test.succeeded) {
      this.toaster.show(this.describe(saved.test.code), { tone: 'error', heading: this.i18n.t('Saved, but {name} failed the test', { name: saved.name }) });
      return;
    }
    const text = saved.delegated
      ? this.i18n.t('Wrote a TXT record at {record} and removed it. Certificates list the CNAMEs to create when you request them.', { record: saved.record })
      : this.i18n.t('Wrote a TXT record at {record} and removed it.', { record: saved.record });
    this.toaster.show(text, { heading: saved.added ? this.i18n.t('Provider added') : this.i18n.t('Provider saved') });
  }

  protected async test(provider: DnsProviderView): Promise<void> {
    this.testing.set(provider.id);
    try {
      const result = await this.api.send<DnsProviderTestView>('dns-providers.test', { id: provider.id });
      this.announceTest(provider, result);
    } catch (problem) {
      this.toaster.show(this.describe(isApiProblem(problem) ? problem.code : undefined), { tone: 'error' });
    } finally {
      this.testing.set(null);
    }
  }

  private announceTest(provider: DnsProviderView, result: DnsProviderTestView): void {
    const name = provider.name;
    if (result.succeeded) {
      this.toaster.show(this.i18n.t('Wrote a TXT record at {record} and removed it.', { record: testRecord(provider) }), { heading: this.i18n.t('{name} works', { name }) });
      return;
    }
    this.toaster.show([this.describe(result.code), result.detail].filter(Boolean).join(' '), { tone: 'error', heading: this.i18n.t('{name} failed the test', { name }) });
  }

  protected async remove(provider: DnsProviderView): Promise<void> {
    if (provider.certificateCount > 0) {
      await this.refuseRemoval(provider);
      return;
    }
    const removed = await this.confirmer.confirm({
      heading: this.i18n.t('Delete {name}?', { name: provider.name }),
      text: this.i18n.t('Its credentials are deleted from every replica. Revoke them at the provider too: backups taken before now still contain them.'),
      confirm: this.i18n.t('Delete provider'),
      busy: this.i18n.t('Deleting…'),
      action: () => this.api.send('dns-providers.remove', { id: provider.id }),
    });
    if (removed) {
      this.toaster.show(this.i18n.t('Revoke its credentials at the provider.'), { heading: this.i18n.t('{name} deleted', { name: provider.name }) });
    }
  }

  private async refuseRemoval(provider: DnsProviderView): Promise<void> {
    const details = await this.details(provider);
    if (!details) {
      return;
    }
    const names = details.certificates.join(', ');
    const text = this.i18n.plural(
      details.certificates.length,
      '{names} is checked through it. Change how it’s checked first.',
      '{names} are checked through it. Change how they’re checked first.',
      { names },
    );
    this.toaster.show(names ? text : this.describe('dnsProvider.inUse'), { tone: 'error', heading: this.i18n.t('{name} is in use', { name: provider.name }) });
  }
}
