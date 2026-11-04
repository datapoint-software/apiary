import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18n } from '@datapoint/apiary-ui';
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

interface Numbers {
  readonly whole: Intl.NumberFormat;
  readonly fine: Intl.NumberFormat;
}

const empty: ActivityView = { minutesPerPoint: 1, points: [] };

function numbers(language: string): Numbers {
  return {
    whole: new Intl.NumberFormat(language, { maximumFractionDigits: 0 }),
    fine: new Intl.NumberFormat(language, { maximumFractionDigits: 1 }),
  };
}

function number(value: number, formats: Numbers): string {
  if (value > 0 && value < 0.1) {
    return '<' + formats.fine.format(0.1);
  }
  return (value < 10 ? formats.fine : formats.whole).format(value);
}

function duration(milliseconds: number, formats: Numbers): [string, string] {
  return milliseconds < 1000 ? [number(milliseconds, formats), 'ms'] : [number(milliseconds / 1000, formats), 's'];
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
  private readonly i18n = inject(I18n);
  readonly range = input.required<ActivityRange>();
  private readonly activity = httpResource<ActivityView>(() => this.api.query('activity.get', { range: this.range() }), {
    defaultValue: empty,
  });
  private readonly refresh = reloadEvery(this.activity);

  private readonly quiet = computed(() => {
    if (this.activity.status() === 'loading') {
      return this.i18n.t('Loading…');
    }
    return this.i18n.t(this.range() === 'hour' ? 'No requests in the last hour' : 'No requests in the last 24 h');
  });

  private readonly formats = computed(() => numbers(this.i18n.language()));

  protected readonly stats = computed<readonly Stat[]>(() => {
    const formats = this.formats();
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
        label: this.i18n.t('Requests'),
        value: number(requests / elapsed, formats),
        unit: '/min',
        note: busiest ? this.peak(`${number(busiest.requests / minutesPerPoint, formats)}/min`, busiest) : quiet,
        series: points.map((p) => p.requests / minutesPerPoint),
      },
      {
        label: this.i18n.t('p95 latency'),
        value: p95Milliseconds === undefined ? '–' : duration(p95Milliseconds, formats)[0],
        unit: p95Milliseconds === undefined ? '' : duration(p95Milliseconds, formats)[1],
        note: slowest ? this.peak(duration(slowest.p95Milliseconds ?? 0, formats).join(' '), slowest) : quiet,
        series: points.map((p) => p.p95Milliseconds ?? 0),
      },
      {
        label: this.i18n.t('5xx responses'),
        value: requests ? number((errors / requests) * 100, formats) : '–',
        unit: requests ? '%' : '',
        note: worst ? this.peak(`${number(share(worst), formats)}%`, worst) : this.quietErrors(requests, quiet),
        series: points.map(share),
      },
    ];
  });

  private peak(value: string, point: ActivityPoint): string {
    return this.i18n.t('Peak {value} at {time}', { value, time: time(point) });
  }

  private quietErrors(requests: number, quiet: string): string {
    return requests ? this.i18n.t('None so far') : quiet;
  }
}
