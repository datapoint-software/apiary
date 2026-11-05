import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@datapoint/apiary-ui';
import { isRelative } from './redirect-rules';

export const statusLabels: Readonly<Record<number, string>> = {
  301: 'Permanent',
  302: 'Temporary',
  307: 'Temporary, keeps method',
  308: 'Permanent, keeps method',
};

@Component({
  selector: 'ap-redirect-target',
  imports: [TranslatePipe],
  template: `<span class="ap-data ap-muted">{{ to() }}</span>
    @if (sameHost()) {
      <span class="ap-caption"> {{ 'Same hostname' | t }}</span>
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectTarget {
  readonly to = input.required<string>();
  protected readonly sameHost = computed(() => isRelative(this.to()));
}
