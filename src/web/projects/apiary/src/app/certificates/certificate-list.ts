import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, EmptyState, ErrorMessages, Icon, PageHead, Status } from '@datapoint/apiary-ui';
import { Upload } from 'lucide';
import { Api } from '../api/api';
import { CertificateSummary } from '../api/models';
import { Auth } from '../auth/auth';
import { openDialog } from '../shell/open-dialog';
import { daysLeft, needsAttention, sourceName, statusText, statusTone } from './certificate-status';
import { UploadDialog } from './upload-dialog';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-certificate-list',
  imports: [WriteLock, PageHead, Button, Icon, Banner, Status, EmptyState, RouterLink],
  templateUrl: './certificate-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly messages = inject(ErrorMessages);
  protected readonly auth = inject(Auth);
  protected readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), { defaultValue: [] });
  protected readonly attention = computed(() => this.certificates.value().filter(needsAttention));
  protected readonly icons = { upload: Upload };
  protected readonly statusText = statusText;
  protected readonly statusTone = statusTone;
  protected readonly sourceName = sourceName;

  protected failure(certificate: CertificateSummary): string {
    return certificate.failureCode ? this.messages.describe(certificate.failureCode) : '';
  }

  protected attentionHeading(certificate: CertificateSummary): string {
    const headings: Record<string, string> = {
      expired: `The certificate for ${certificate.name} expired`,
      expiring: `The certificate for ${certificate.name} expires in ${daysLeft(certificate)} days`,
    };
    return headings[certificate.status] ?? `Apiary can’t get a certificate for ${certificate.name}`;
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
