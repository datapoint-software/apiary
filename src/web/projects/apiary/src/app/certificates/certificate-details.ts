import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, Confirmer, ErrorMessages, Icon, PageHead, Status, Toaster } from '@datapoint/apiary-ui';
import { RefreshCw, Upload } from 'lucide';
import { Api } from '../api/api';
import { CertificateDetails as Details, ProjectView, RenewResult } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { openDialog } from '../shell/open-dialog';
import { CertificateFacts } from './certificate-facts';
import { CertificateHistory } from './certificate-history';
import { sourceName, statusText, statusTone } from './certificate-status';
import { UploadDialog } from './upload-dialog';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-certificate-details',
  imports: [WriteLock, PageHead, Button, Icon, Banner, Status, RouterLink, CertificateFacts, CertificateHistory],
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
  protected readonly auth = inject(Auth);
  protected readonly details = httpResource<Details>(() => this.api.query('certificates.get', { id: this.id() }));
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly certificate = computed(() => this.details.value()?.certificate);
  protected readonly project = computed(() => this.projects.value().find((p) => p.id === this.certificate()?.projectId)?.name);
  protected readonly lastFailure = computed(() => {
    const details = this.details.value();
    return details?.certificate.status === 'failing' ? details.history.find((e) => e.kind === 'failed') : undefined;
  });
  protected readonly renewing = signal(false);
  protected readonly icons = { renew: RefreshCw, upload: Upload };
  protected readonly statusText = statusText;
  protected readonly statusTone = statusTone;
  protected readonly sourceName = sourceName;
  protected readonly utcDateTime = utcDateTime;

  protected describe(code: string): string {
    return this.messages.describe(code);
  }

  protected async renew(): Promise<void> {
    this.renewing.set(true);
    try {
      const result = await this.api.send<RenewResult>('certificates.renew', { id: this.id() });
      if (result.renewed && result.notAfter) {
        this.toaster.show(`Valid until ${result.notAfter.slice(0, 10)}. Every replica uses it now.`, { heading: 'Certificate renewed' });
      } else {
        const reason = result.failureCode ? this.messages.describe(result.failureCode) : '';
        this.toaster.show([reason, result.failureDetail].filter(Boolean).join(' '), { heading: 'Renewal failed', tone: 'error' });
      }
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as { code?: string }).code ?? 'internal'), { tone: 'error' });
    } finally {
      this.renewing.set(false);
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
      heading: `Delete the certificate for ${certificate.name}?`,
      text: 'No route uses it. Its private key is deleted from every replica.',
      confirm: 'Delete certificate',
      busy: 'Deleting…',
      action: () => this.api.send('certificates.delete', { id: certificate.id }),
    });
    if (deleted) {
      this.toaster.show('Certificate deleted.');
      await this.router.navigate(['/certificates']);
    }
  }
}
