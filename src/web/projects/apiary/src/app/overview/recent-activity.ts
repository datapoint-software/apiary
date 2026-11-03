import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api/api';
import { AuditEntry } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { actionLabel } from '../audit/action-labels';

@Component({
  selector: 'ap-recent-activity',
  imports: [RouterLink],
  template: `
    <section class="ap-panel" aria-labelledby="activity-title">
      <div class="ap-panel-head">
        <h2 class="ap-h ap-h-2" id="activity-title">Recent activity</h2>
        <a class="ap-caption" style="color: var(--honey-text)" routerLink="/audit">Open the audit log</a>
      </div>
      <div class="ap-panel-body" style="padding-block: 4px">
        <ol class="ap-timeline">
          @for (entry of recent(); track entry.id) {
            <li class="ap-event" [class.ap-event-denied]="entry.outcome !== 'succeeded'">
              <span class="ap-dot" aria-hidden="true"></span>
              <div>
                <div>{{ entry.outcome === 'succeeded' ? '' : 'Denied: ' }}{{ entry.user ?? 'System' }} {{ actionLabel(entry.action) }}</div>
                <div class="ap-event-meta"><span class="ap-data">{{ entry.action }}</span></div>
              </div>
              <time [attr.datetime]="entry.at">{{ timeAgo(entry.at) }}</time>
            </li>
          } @empty {
            <li class="ap-muted" style="padding: 12px 0">Nothing in the last 7 days.</li>
          }
        </ol>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivity {
  private readonly api = inject(Api);
  private readonly entries = httpResource<AuditEntry[]>(
    () => this.api.query('audit.list', { from: new Date(Date.now() - 7 * 86_400_000).toISOString() }),
    { defaultValue: [] },
  );
  protected readonly recent = computed(() => this.entries.value().slice(0, 4));
  protected readonly actionLabel = actionLabel;
  protected readonly timeAgo = timeAgo;
}
