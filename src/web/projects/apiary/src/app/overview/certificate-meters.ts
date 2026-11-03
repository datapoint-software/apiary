import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Status } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { CertificateSummary } from '../api/models';
import { daysLeft, sourceName, statusText, statusTone } from '../certificates/certificate-status';

interface Meter {
  readonly certificate: CertificateSummary;
  readonly days: number;
  readonly lifetime: number;
  readonly percent: number;
}

function meter(certificate: CertificateSummary): Meter {
  const start = certificate.notBefore ? Date.parse(certificate.notBefore) : Date.now();
  const end = certificate.notAfter ? Date.parse(certificate.notAfter) : Date.now();
  const lifetime = Math.max(1, Math.round((end - start) / 86_400_000));
  const days = daysLeft(certificate);
  return { certificate, days, lifetime, percent: Math.max(2, Math.min(100, Math.round((days / lifetime) * 100))) };
}

@Component({
  selector: 'ap-certificate-meters',
  imports: [RouterLink, Status],
  template: `
    <section class="ap-panel" aria-labelledby="certificates-title">
      <div class="ap-panel-head">
        <h2 class="ap-h ap-h-2" id="certificates-title">Certificates</h2>
        <a class="ap-caption" style="color: var(--honey-text)" routerLink="/certificates">All {{ certificates.value().length }}</a>
      </div>
      <div class="ap-panel-body ap-stack">
        @for (item of meters(); track item.certificate.id) {
          @let tone = statusTone(item.certificate);
          <div class="ap-meter" [class]="tone === 'ok' ? '' : 'ap-meter-' + tone">
            <div class="ap-meter-head">
              <a class="ap-data" style="color: var(--ink)" [routerLink]="['/certificates', item.certificate.id]">{{ item.certificate.name }}</a>
              <ap-status [tone]="tone">{{ statusText(item.certificate) }}</ap-status>
            </div>
            <div
              class="ap-meter-track"
              role="meter"
              aria-valuemin="0"
              [attr.aria-valuemax]="item.lifetime"
              [attr.aria-valuenow]="item.days"
              [attr.aria-label]="'Days left for ' + item.certificate.name"
            >
              <div class="ap-meter-fill" [style.width.%]="item.percent"></div>
            </div>
            <span class="ap-caption">{{ sourceName(item.certificate) }}</span>
          </div>
        } @empty {
          <p class="ap-muted" style="margin: 0">No certificates yet. Each route gets one automatically.</p>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateMeters {
  private readonly api = inject(Api);
  protected readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), {
    defaultValue: [],
  });
  protected readonly meters = computed(() =>
    this.certificates
      .value()
      .map(meter)
      .sort((a, b) => a.days - b.days)
      .slice(0, 4),
  );
  protected readonly statusTone = statusTone;
  protected readonly statusText = statusText;
  protected readonly sourceName = sourceName;
}
