import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const width = 220;
const height = 36;

@Component({
  selector: 'ap-sparkline',
  host: { style: 'display: contents' },
  template: `
    @if (shape(); as s) {
      <svg class="ap-spark" [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" aria-hidden="true">
        <line class="ap-spark-grid" x1="0" [attr.y1]="height" [attr.x2]="width" [attr.y2]="height" />
        <path class="ap-spark-area" [attr.d]="s.area" />
        <path class="ap-spark-line" [attr.d]="s.line" vector-effect="non-scaling-stroke" />
        <circle class="ap-spark-end" [attr.cx]="s.x" [attr.cy]="s.y" r="3.5" />
      </svg>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sparkline {
  readonly values = input.required<readonly number[]>();
  protected readonly width = width;
  protected readonly height = height;
  protected readonly shape = computed(() => {
    const values = this.values();
    if (values.length < 2) {
      return null;
    }
    const max = Math.max(...values) || 1;
    const step = width / (values.length - 1);
    const points = values.map((v, i) => [i * step, height - (v / max) * height] as const);
    const line = 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
    const [x, y] = points[points.length - 1];
    return { line, area: `${line} L${width},${height} L0,${height} Z`, x, y };
  });
}
