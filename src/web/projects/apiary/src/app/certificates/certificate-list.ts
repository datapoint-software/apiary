import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, EmptyState, ErrorMessages, I18n, Icon, PageHead, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { Globe, Plus, Upload } from 'lucide';
import { Api } from '../api/api';
import { CertificateSummary, DnsProviderView } from '../api/models';
import { Auth } from '../auth/auth';
import { openDialog } from '../shell/open-dialog';
import { checkedWith, daysLeft, needsAttention, sourceName, statusText, statusTone } from './certificate-status';
import { isFailing } from '../dns-providers/dns-names';
import { RequestDialog, RequestDialogData } from './request-dialog';
import { UploadDialog } from './upload-dialog';
import { AdminCertificatePanel } from './admin-certificate-panel';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-certificate-list',
  imports: [WriteLock, AdminCertificatePanel, PageHead, Button, Icon, Banner, Status, EmptyState, RouterLink, TranslatePipe],
  templateUrl: './certificate-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), { defaultValue: [] });
  protected readonly attention = computed(() => this.certificates.value().filter(needsAttention));
  protected readonly providers = httpResource<DnsProviderView[]>(() => this.api.query('dns-providers.list'), { defaultValue: [] });
  protected readonly failingProviders = computed(() => this.providers.value().filter(isFailing));
  protected readonly failingHeading = computed(() => {
    const failing = this.failingProviders();
    return this.i18n.plural(failing.length, '{name} is failing', '{count} DNS providers are failing', { name: failing[0]?.name ?? '' });
  });
  protected readonly icons = { upload: Upload, request: Plus, providers: Globe };
  protected readonly statusTone = statusTone;
  protected readonly sourceName = sourceName;

  protected statusText(certificate: CertificateSummary): string {
    return statusText(certificate, this.i18n);
  }

  protected checkedWith(certificate: CertificateSummary): string {
    return checkedWith(certificate, this.providers.value(), this.i18n);
  }

  protected routes(certificate: CertificateSummary): string {
    return certificate.routeCount === 0 && certificate.requested ? this.i18n.t('Ready ahead') : String(certificate.routeCount);
  }

  protected failure(certificate: CertificateSummary): string {
    return certificate.failureCode ? this.messages.describe(certificate.failureCode) : '';
  }

  protected attentionHeading(certificate: CertificateSummary): string {
    const name = certificate.name;
    const headings: Record<string, () => string> = {
      expired: () => this.i18n.t('The certificate for {name} expired', { name }),
      expiring: () => this.i18n.plural(daysLeft(certificate), 'The certificate for {name} expires in {count} day', 'The certificate for {name} expires in {count} days', { name }),
    };
    return headings[certificate.status]?.() ?? this.i18n.t('Apiary can’t get a certificate for {name}', { name });
  }

  protected expires(certificate: CertificateSummary): string {
    return certificate.notAfter ? certificate.notAfter.slice(0, 10) : '–';
  }

  protected async requestCertificate(): Promise<void> {
    const data: RequestDialogData = { providers: this.providers.value(), canAdminister: this.auth.canAdminister() };
    const id = await openDialog<string, RequestDialogData>(this.dialog, RequestDialog, data);
    if (id) {
      await this.router.navigate(['/certificates', id]);
    }
  }

  protected async upload(): Promise<void> {
    const id = await openDialog<string, null>(this.dialog, UploadDialog, null);
    if (id) {
      await this.router.navigate(['/certificates', id]);
    }
  }
}
