import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@datapoint/apiary-ui';
import { CertificateDetails } from '../api/models';
import { utcDateTime } from '../api/time-ago';

@Component({
  selector: 'ap-certificate-facts',
  imports: [Button, RouterLink],
  template: `
    @let c = details().certificate;
    <section class="ap-panel" aria-labelledby="details-title">
      <div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="details-title">Details</h2></div>
      <div class="ap-panel-body">
        <dl class="ap-kv">
          <dt>Covers</dt>
          <dd class="ap-data">{{ c.hosts.join(', ') }}</dd>
          <dt>Issuer</dt>
          <dd>{{ c.issuer ?? '–' }}</dd>
          @if (c.notBefore && c.notAfter) {
            <dt>Valid</dt>
            <dd><span class="ap-data">{{ utcDateTime(c.notBefore) }}</span> to <span class="ap-data">{{ utcDateTime(c.notAfter) }}</span> UTC</dd>
          }
          <dt>Renewal</dt>
          <dd>{{ renewal() }}</dd>
          @if (chain()) {
            <dt>Chain</dt>
            <dd>{{ chain() }}</dd>
          }
          @if (project()) {
            <dt>Project</dt>
            <dd>{{ project() }}</dd>
          }
          <dt>Used by</dt>
          <dd>
            @for (route of details().routes; track route.id) {
              <a class="ap-data" [routerLink]="['/routes', route.id]">{{ route.host }}{{ route.path === '/' ? '' : route.path }}</a><br />
            } @empty {
              {{ unused() }}
            }
          </dd>
        </dl>
      </div>
      <div class="ap-panel-foot ap-row" style="justify-content: space-between">
        <span class="ap-caption">Private keys never leave the cluster, and are encrypted with the root key.</span>
        @if (canDelete()) {
          <button
            apButton="ghost"
            size="small"
            type="button"
            style="color: var(--critical)"
            [disabled]="details().routes.length > 0"
            [attr.title]="details().routes.length > 0 ? 'Routes use it. Change their certificate first.' : null"
            (click)="delete.emit()"
          >
            Delete…
          </button>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateFacts {
  readonly details = input.required<CertificateDetails>();
  readonly project = input<string>();
  readonly canDelete = input(false);
  readonly delete = output();
  protected readonly utcDateTime = utcDateTime;

  protected readonly renewal = computed(() => {
    const c = this.details().certificate;
    if (c.source === 'uploaded') {
      return 'Manual: upload a new one before it expires';
    }
    return c.renewsFrom ? `From ${c.renewsFrom.slice(0, 10)}, retrying until it works` : 'As soon as Let’s Encrypt can reach the hostname';
  });

  protected readonly chain = computed(() => {
    const length = this.details().chainLength;
    if (!length) {
      return '';
    }
    return length === 1 ? '1 certificate' : `${length} certificates`;
  });

  protected readonly unused = computed(() => {
    const since = this.details().certificate.unusedSince;
    return since ? `No routes since ${since.slice(0, 10)}. Apiary deletes it 30 days later.` : 'No routes';
  });
}
