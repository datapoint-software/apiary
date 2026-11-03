import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ErrorMessages } from '@datapoint/apiary-ui';
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
  template: `
    <section class="ap-panel" aria-labelledby="history-title">
      <div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="history-title">{{ heading() }}</h2></div>
      <div class="ap-panel-body" style="padding-block: 4px">
        @if (events().length) {
          <ol class="ap-timeline">
            @for (event of events(); track $index) {
              <li class="ap-event" [class.ap-event-denied]="event.kind === 'failed'">
                <span class="ap-dot" aria-hidden="true"></span>
                <div>
                  <div>{{ eventNames[event.kind] }}</div>
                  <div class="ap-event-meta">{{ detail(event) }}</div>
                </div>
                <time [attr.datetime]="event.at">{{ utcDateTime(event.at) }}</time>
              </li>
            }
          </ol>
        } @else {
          <p class="ap-muted" style="margin: 12px 0">Nothing yet.</p>
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
  protected readonly eventNames = eventNames;
  protected readonly utcDateTime = utcDateTime;

  protected detail(event: CertificateEvent): string {
    const parts = [event.code ? this.messages.describe(event.code) : '', event.detail ?? '', event.by ? `By ${event.by}` : ''];
    return parts.filter(Boolean).join(' · ');
  }
}
