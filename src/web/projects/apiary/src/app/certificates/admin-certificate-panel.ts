import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, Confirmer, I18n, Icon, Status, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { RotateCcw, Upload } from 'lucide';
import { Api } from '../api/api';
import { AdminCertificateView } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { UploadDialog, UploadTarget } from './upload-dialog';

@Component({
  selector: 'ap-admin-certificate-panel',
  imports: [WriteLock, Button, Icon, Status, TranslatePipe],
  template: `
    <section class="ap-panel" aria-labelledby="admin-certificate-title">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="admin-certificate-title">{{ 'Admin interface' | t }}</h2>
          <p class="ap-panel-desc">{{ 'The certificate for this interface, on the admin port of every replica. Only Administrators see it.' | t }}</p>
        </div>
        @if (certificate.value(); as current) {
          <div class="ap-row" style="gap: 8px">
            @if (!current.selfSigned) {
              <button apWrite apButton size="small" type="button" (click)="reset()"><ap-icon [icon]="icons.reset" />{{ 'Use a self-signed one' | t }}</button>
            }
            <button apWrite apButton size="small" type="button" (click)="upload()"><ap-icon [icon]="icons.upload" />{{ 'Upload certificate' | t }}</button>
          </div>
        }
      </div>
      <div class="ap-panel-body">
        @if (certificate.value(); as current) {
          <dl class="ap-kv">
            <dt>{{ 'Source' | t }}</dt>
            <dd>
              @if (current.selfSigned) {
                <ap-status tone="warn">{{ 'Self-signed' | t }}</ap-status>
                <span class="ap-caption" style="display: block; margin-top: 4px">{{ 'Browsers warn about it. Check the fingerprint before you accept it, or upload a certificate your computers trust.' | t }}</span>
              } @else {
                <ap-status tone="ok">{{ 'Uploaded' | t }}</ap-status>
              }
            </dd>
            <dt>{{ 'Covers' | t }}</dt>
            <dd class="ap-data">{{ current.hosts.join(', ') }}</dd>
            <dt>{{ 'Issuer' | t }}</dt>
            <dd>{{ current.issuer }}</dd>
            <dt>{{ 'Valid until' | t }}</dt>
            <dd><span class="ap-data">{{ utcDateTime(current.notAfter) }}</span> UTC</dd>
            <dt>{{ 'SHA-256 fingerprint' | t }}</dt>
            <dd class="ap-data" style="font-size: 0.75rem">{{ current.fingerprint }}</dd>
          </dl>
        } @else if (certificate.isLoading()) {
          <span class="ap-skel" style="width: 60%; height: 14px" aria-busy="true" [attr.aria-label]="'Loading' | t"></span>
        } @else {
          <p style="margin: 0">{{ 'The cluster creates a self-signed certificate once a majority of replicas is up.' | t }}</p>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCertificatePanel {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly certificate = httpResource<AdminCertificateView | null>(() => this.api.query('admin-certificate.get'), { defaultValue: null });
  protected readonly icons = { upload: Upload, reset: RotateCcw };
  protected readonly utcDateTime = utcDateTime;

  protected async upload(): Promise<void> {
    if (await openDialog<string, UploadTarget>(this.dialog, UploadDialog, { name: 'the admin interface', admin: true })) {
      this.certificate.reload();
    }
  }

  protected async reset(): Promise<void> {
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Use a self-signed certificate?'),
      text: this.i18n.t(
        'Every replica switches to a new self-signed certificate. Browsers warn about it until each person checks its fingerprint and accepts it. Browsers that opened this interface by its hostname with the current certificate remember to require a trusted one (HSTS), and refuse the self-signed one for up to a year.',
      ),
      confirm: this.i18n.t('Use a self-signed one'),
      busy: this.i18n.t('Switching…'),
      action: async () => {
        await this.api.send('admin-certificate.reset');
      },
    });
    if (done) {
      this.toaster.show(this.i18n.t('Check the new fingerprint the next time your browser warns about it.'), { heading: this.i18n.t('Self-signed certificate in use') });
      this.certificate.reload();
    }
  }
}
