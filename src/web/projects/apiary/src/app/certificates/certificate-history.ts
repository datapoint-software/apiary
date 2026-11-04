import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ErrorMessages, I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { CertificateEvent } from '../api/models';
import { utcDateTime } from '../api/time-ago';

const eventNames: Record<CertificateEvent['kind'], string> = {
  issued: 'Issued',
  renewed: 'Renewed',
  uploaded: 'Uploaded',
  replaced: 'Replaced',
  failed: 'Failed',
};

@Component({
  selector: 'ap-certificate-history',
  imports: [TranslatePipe],
  template: `
    <section class="ap-panel" aria-labelledby="history-title">
      <div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="history-title">{{ heading() | t }}</h2></div>
      <div class="ap-panel-body" style="padding-block: 4px">
        @if (events().length) {
          <ol class="ap-timeline">
            @for (event of events(); track $index) {
              <li class="ap-event" [class.ap-event-denied]="event.kind === 'failed'">
                <span class="ap-dot" aria-hidden="true"></span>
                <div>
                  <div>{{ eventNames[event.kind] | t }}</div>
                  <div class="ap-event-meta">{{ detail(event) }}</div>
                </div>
                <time [attr.datetime]="event.at">{{ utcDateTime(event.at) }}</time>
              </li>
            }
          </ol>
        } @else {
          <p class="ap-muted" style="margin: 12px 0">{{ 'Nothing yet.' | t }}</p>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateHistory {
  readonly events = input.required<readonly CertificateEvent[]>();
  readonly heading = input('History');
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly eventNames = eventNames;
  protected readonly utcDateTime = utcDateTime;

  protected detail(event: CertificateEvent): string {
    const parts = [event.code ? this.messages.describe(event.code) : '', event.detail ?? '', event.by ? this.i18n.t('By {name}', { name: event.by }) : ''];
    return parts.filter(Boolean).join(' · ');
  }
}
