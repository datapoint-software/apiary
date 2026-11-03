import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Api } from '../api/api';
import { ActivityPoint, ActivityRange, ActivityView } from '../api/models';
import { reloadEvery } from '../api/reload-every';
import { Sparkline } from './sparkline';

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly note: string;
  readonly series: readonly number[];
}

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fine = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const empty: ActivityView = { minutesPerPoint: 1, points: [] };

function number(value: number): string {
  if (value > 0 && value < 0.1) {
    return '<0.1';
  }
  return (value < 10 ? fine : whole).format(value);
}

function duration(milliseconds: number): [string, string] {
  return milliseconds < 1000 ? [number(milliseconds), 'ms'] : [number(milliseconds / 1000), 's'];
}

function time(point: ActivityPoint): string {
  return new Date(point.at).toISOString().slice(11, 16) + ' UTC';
}

function peak(points: readonly ActivityPoint[], measure: (p: ActivityPoint) => number): ActivityPoint | undefined {
  return points.reduce<ActivityPoint | undefined>((best, p) => (measure(p) > (best ? measure(best) : 0) ? p : best), undefined);
}

function share(point: ActivityPoint): number {
  return point.requests ? (point.errors / point.requests) * 100 : 0;
}

function quietErrors(requests: number, quiet: string): string {
  return requests ? 'None so far' : quiet;
}

@Component({
  selector: 'ap-activity-stats',
  imports: [Sparkline],
  template: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px">
      @for (stat of stats(); track stat.label) {
        <div class="ap-panel ap-stat">
          <span class="ap-overline">{{ stat.label }}</span>
          <span class="ap-stat-value">{{ stat.value }}<span class="ap-stat-unit">{{ stat.unit }}</span></span>
          <span class="ap-stat-delta">{{ stat.note }}</span>
          <ap-sparkline [values]="stat.series" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityStats {
  private readonly api = inject(Api);
  readonly range = input.required<ActivityRange>();
  private readonly activity = httpResource<ActivityView>(() => this.api.query('activity.get', { range: this.range() }), {
    defaultValue: empty,
  });
  private readonly refresh = reloadEvery(this.activity);

  private readonly quiet = computed(() => {
    if (this.activity.status() === 'loading') {
      return 'Loading…';
    }
    return this.range() === 'hour' ? 'No requests in the last hour' : 'No requests in the last 24 h';
  });

  protected readonly stats = computed<readonly Stat[]>(() => {
    const { minutesPerPoint, points, p95Milliseconds } = this.activity.value();
    const quiet = this.quiet();
    const requests = points.reduce((sum, p) => sum + p.requests, 0);
    const errors = points.reduce((sum, p) => sum + p.errors, 0);
    const elapsed = points.length ? Math.max(1, (Date.now() - Date.parse(points[0].at)) / 60_000) : 1;
    const busiest = peak(points, (p) => p.requests);
    const slowest = peak(points, (p) => p.p95Milliseconds ?? 0);
    const worst = peak(points, share);
    return [
      {
        label: 'Requests',
        value: number(requests / elapsed),
        unit: '/min',
        note: busiest ? `Peak ${number(busiest.requests / minutesPerPoint)}/min at ${time(busiest)}` : quiet,
        series: points.map((p) => p.requests / minutesPerPoint),
      },
      {
        label: 'p95 latency',
        value: p95Milliseconds === undefined ? '–' : duration(p95Milliseconds)[0],
        unit: p95Milliseconds === undefined ? '' : duration(p95Milliseconds)[1],
        note: slowest ? `Peak ${duration(slowest.p95Milliseconds ?? 0).join(' ')} at ${time(slowest)}` : quiet,
        series: points.map((p) => p.p95Milliseconds ?? 0),
      },
      {
        label: '5xx responses',
        value: requests ? number((errors / requests) * 100) : '–',
        unit: '%',
        note: worst ? `Peak ${number(share(worst))}% at ${time(worst)}` : quietErrors(requests, quiet),
        series: points.map(share),
      },
    ];
  });
}
