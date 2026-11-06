import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { WriteLock } from '../cluster/write-lock';
import { CertificateDetails } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { dateRangeWords } from './date-range';

@Component({
  selector: 'ap-certificate-facts',
  imports: [WriteLock, Button, RouterLink, TranslatePipe],
  template: `
    @let c = details().certificate;
    <section class="ap-panel" aria-labelledby="details-title">
      <div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="details-title">{{ 'Details' | t }}</h2></div>
      <div class="ap-panel-body">
        <dl class="ap-kv">
          <dt>{{ 'Covers' | t }}</dt>
          <dd class="ap-data">{{ c.hosts.join(', ') }}</dd>
          @if (c.source === 'automatic') {
            <dt>{{ 'Checked with' | t }}</dt>
            <dd>
              {{ checkedWith() }}
              @if (canChange()) {
                <button apWrite apButton="ghost" size="small" type="button" style="margin-left: 6px" (click)="changeChallenge.emit()">{{ 'Change' | t }}</button>
              }
              @if (challengeZone(); as zone) {
                <span class="ap-caption" style="display: block">{{ 'Through CNAMEs into {zone}' | t: { zone } }}</span>
              }
            </dd>
          }
          <dt>{{ 'Issuer' | t }}</dt>
          <dd>{{ c.issuer ?? '–' }}</dd>
          @if (c.notBefore && c.notAfter) {
            <dt>{{ 'Valid' | t }}</dt>
            <dd>{{ range()[0] }}<span class="ap-data">{{ utcDateTime(c.notBefore) }}</span>{{ range()[1] }}<span class="ap-data">{{ utcDateTime(c.notAfter) }}</span>{{ range()[2] }}</dd>
          }
          <dt>{{ 'Renewal' | t }}</dt>
          <dd>{{ renewal() }}</dd>
          @if (chain()) {
            <dt>{{ 'Chain' | t }}</dt>
            <dd>{{ chain() }}</dd>
          }
          @if (project()) {
            <dt>{{ 'Project' | t }}</dt>
            <dd>{{ project() }}</dd>
          }
          <dt>{{ 'Used by' | t }}</dt>
          <dd>
            @for (route of details().routes; track route.id) {
              <a class="ap-data" [routerLink]="['/routes', route.id]">{{ route.host }}{{ route.path === '/' ? '' : route.path }}</a><br />
            } @empty {
              {{ unused() }}
            }
            @if (otherHosts() > 0 && canChange()) {
              <span class="ap-caption" style="display: block; margin-top: 4px"
                >{{ others() }} <button apWrite apButton="ghost" size="small" type="button" (click)="switchHosts.emit()">{{ 'Switch them' | t }}</button></span
              >
            }
          </dd>
        </dl>
      </div>
      <div class="ap-panel-foot ap-row" style="justify-content: space-between">
        <span class="ap-caption">{{ 'Private keys never leave the cluster, and are encrypted with the root key.' | t }}</span>
        @if (canDelete()) {
          <button
            apButton="ghost"
            size="small"
            type="button"
            style="color: var(--critical)"
            [disabled]="details().routes.length > 0"
            [attr.title]="details().routes.length > 0 ? ('Routes use it. Change their certificate first.' | t) : null"
            (click)="delete.emit()"
          >
            {{ 'Delete…' | t }}
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
  readonly checkedWith = input('');
  readonly challengeZone = input<string>();
  readonly canChange = input(false);
  readonly otherHosts = input(0);
  readonly delete = output();
  readonly changeChallenge = output();
  readonly switchHosts = output();
  private readonly i18n = inject(I18n);
  protected readonly utcDateTime = utcDateTime;
  protected readonly range = computed(() => dateRangeWords(this.i18n));

  protected readonly renewal = computed(() => {
    const c = this.details().certificate;
    if (c.source === 'uploaded') {
      return this.i18n.t('Manual: upload a new one before it expires');
    }
    if (c.renewsFrom) {
      return this.i18n.t('From {date}, retrying until it works', { date: c.renewsFrom.slice(0, 10) });
    }
    return c.dnsProviderId ? this.i18n.t('As soon as the DNS record is in place') : this.i18n.t('As soon as Let’s Encrypt can reach the hostname');
  });

  protected readonly chain = computed(() => {
    const length = this.details().chainLength;
    if (!length) {
      return '';
    }
    return this.i18n.plural(length, '{count} certificate', '{count} certificates');
  });

  protected readonly unused = computed(() => {
    const c = this.details().certificate;
    if (c.unusedSince) {
      return this.i18n.t('No routes since {date}. Apiary deletes it 30 days later.', { date: c.unusedSince.slice(0, 10) });
    }
    return c.requested ? this.i18n.t('No routes yet. It’s ready for when a route chooses it.') : this.i18n.t('No routes');
  });

  protected readonly others = computed(() =>
    this.i18n.plural(this.otherHosts(), '{count} other hostname it covers uses its own.', '{count} other hostnames it covers use their own.'),
  );
}
