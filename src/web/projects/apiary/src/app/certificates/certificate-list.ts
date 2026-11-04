import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, EmptyState, ErrorMessages, I18n, Icon, PageHead, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { Upload } from 'lucide';
import { Api } from '../api/api';
import { CertificateSummary } from '../api/models';
import { Auth } from '../auth/auth';
import { openDialog } from '../shell/open-dialog';
import { daysLeft, needsAttention, sourceName, statusText, statusTone } from './certificate-status';
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
  protected readonly icons = { upload: Upload };
  protected readonly statusTone = statusTone;
  protected readonly sourceName = sourceName;

  protected statusText(certificate: CertificateSummary): string {
    return statusText(certificate, this.i18n);
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

  protected async upload(): Promise<void> {
    const id = await openDialog<string, null>(this.dialog, UploadDialog, null);
    if (id) {
      await this.router.navigate(['/certificates', id]);
    }
  }
}
