import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, Confirmer, ErrorMessages, I18n, Icon, PageHead, Status, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { RefreshCw, Upload } from 'lucide';
import { Api } from '../api/api';
import { CertificateDetails as Details, CertificateSummary, DnsProviderView, ProjectView, RenewResult, RouteView } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { openDialog } from '../shell/open-dialog';
import { CertificateFacts } from './certificate-facts';
import { CertificateHistory } from './certificate-history';
import { checkedWith, isRenewedWildcard, sourceName, statusText, statusTone } from './certificate-status';
import { ChallengeDialog, ChallengeDialogData } from './challenge-dialog';
import { coveredHosts } from './covered-hosts';
import { SwitchHostsData, SwitchHostsDialog } from './switch-hosts-dialog';
import { UploadDialog } from './upload-dialog';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-certificate-details',
  imports: [WriteLock, PageHead, Button, Icon, Banner, Status, RouterLink, CertificateFacts, CertificateHistory, TranslatePipe],
  templateUrl: './certificate-details.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateDetails {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly confirmer = inject(Confirmer);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly details = httpResource<Details>(() => this.api.query('certificates.get', { id: this.id() }));
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly providers = httpResource<DnsProviderView[]>(() => this.api.query('dns-providers.list'), { defaultValue: [] });
  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), { defaultValue: [] });
  protected readonly certificate = computed(() => this.details.value()?.certificate);
  protected readonly provider = computed(() => this.providers.value().find((p) => p.id === this.certificate()?.dnsProviderId));
  protected readonly checkedWith = computed(() => {
    const certificate = this.certificate();
    return certificate ? checkedWith(certificate, this.providers.value(), this.i18n) : '';
  });
  protected readonly otherHosts = computed(() => {
    const certificate = this.certificate();
    return certificate && isRenewedWildcard(certificate) ? coveredHosts(certificate, this.routes.value(), this.certificates.value()) : [];
  });
  protected readonly pendingText = computed(() => {
    const provider = this.provider();
    return provider
      ? this.i18n.t('Apiary writes a TXT record through {name} and waits until every name server shows it, then asks Let’s Encrypt.', { name: provider.name })
      : this.i18n.t('Let’s Encrypt checks the hostname by fetching a file from it on port 80, so its DNS must point at your edge nodes. Until then, the route answers over HTTP only.');
  });
  protected readonly project = computed(() => this.projects.value().find((p) => p.id === this.certificate()?.projectId)?.name);
  protected readonly lastFailure = computed(() => {
    const details = this.details.value();
    return details?.certificate.status === 'failing' ? details.history.find((e) => e.kind === 'failed') : undefined;
  });
  protected readonly renewing = signal(false);
  protected readonly icons = { renew: RefreshCw, upload: Upload };
  protected readonly statusTone = statusTone;
  protected readonly sourceName = sourceName;
  protected readonly utcDateTime = utcDateTime;

  protected statusText(certificate: CertificateSummary): string {
    return statusText(certificate, this.i18n);
  }

  protected describe(code: string): string {
    return this.messages.describe(code);
  }

  protected async renew(): Promise<void> {
    this.renewing.set(true);
    try {
      const result = await this.api.send<RenewResult>('certificates.renew', { id: this.id() });
      if (result.renewed && result.notAfter) {
        this.toaster.show(this.i18n.t('Valid until {date}. Every replica uses it now.', { date: result.notAfter.slice(0, 10) }), { heading: this.i18n.t('Certificate renewed') });
      } else {
        const reason = result.failureCode ? this.messages.describe(result.failureCode) : '';
        this.toaster.show([reason, result.failureDetail].filter(Boolean).join(' '), { heading: this.i18n.t('Renewal failed'), tone: 'error' });
      }
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as { code?: string }).code ?? 'internal'), { tone: 'error' });
    } finally {
      this.renewing.set(false);
    }
  }

  protected async changeChallenge(): Promise<void> {
    const certificate = this.certificate();
    if (!certificate) {
      return;
    }
    const data: ChallengeDialogData = { certificate, providers: this.providers.value(), canAdminister: this.auth.canAdminister() };
    const chosen = await openDialog<string, ChallengeDialogData>(this.dialog, ChallengeDialog, data);
    if (!chosen) {
      return;
    }
    const provider = this.providers.value().find((p) => p.id === chosen);
    const text = provider
      ? this.i18n.t('From the next renewal, Let’s Encrypt checks it with a DNS record through {name}.', { name: provider.name })
      : this.i18n.t('From the next renewal, Let’s Encrypt checks it with a file on port 80.');
    this.toaster.show(text, { heading: this.i18n.t('Changed how {name} is checked', { name: certificate.name }) });
  }

  protected async switchHosts(): Promise<void> {
    const certificate = this.certificate();
    if (!certificate) {
      return;
    }
    const data: SwitchHostsData = { certificate, hosts: this.otherHosts() };
    const count = await openDialog<number, SwitchHostsData>(this.dialog, SwitchHostsDialog, data);
    if (count) {
      this.toaster.show(this.i18n.plural(count, '{count} hostname uses {name} now.', '{count} hostnames use {name} now.', { name: certificate.name }), {
        heading: this.i18n.t('Switched'),
      });
    }
  }

  protected async replace(): Promise<void> {
    const certificate = this.certificate();
    if (certificate) {
      await openDialog<string, { id: string; name: string; projectId?: string }>(this.dialog, UploadDialog, certificate);
    }
  }

  protected async delete(): Promise<void> {
    const certificate = this.certificate();
    if (!certificate) {
      return;
    }
    const deleted = await this.confirmer.confirm({
      heading: this.i18n.t('Delete the certificate for {name}?', { name: certificate.name }),
      text: this.i18n.t('No route uses it. Its private key is deleted from every replica.'),
      confirm: this.i18n.t('Delete certificate'),
      busy: this.i18n.t('Deleting…'),
      action: () => this.api.send('certificates.delete', { id: certificate.id }),
    });
    if (deleted) {
      this.toaster.show(this.i18n.t('Certificate deleted.'));
      await this.router.navigate(['/certificates']);
    }
  }
}
