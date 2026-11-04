import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@datapoint/apiary-ui';
import { BrandView } from '../api/models';

@Component({
  selector: 'ap-brand-summary',
  imports: [TranslatePipe],
  template: `
    <div style="display: flex; gap: 14px; align-items: center; min-width: 0">
      @if (brand().logo; as logo) {
        <img [src]="logo" alt="" style="height: 40px; width: 40px; object-fit: contain; flex: none" />
      } @else {
        <span class="ap-avatar" aria-hidden="true" style="width: 40px; height: 40px; flex: none">{{ initials() }}</span>
      }
      <div class="ap-cell-main" style="min-width: 0">
        <strong translate="no">{{ brand().name }}</strong>
        <span class="ap-caption" translate="no">{{ brand().contact || ('No contact line' | t) }}</span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandSummary {
  readonly brand = input.required<BrandView>();
  protected readonly initials = computed(() =>
    this.brand()
      .name.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );
}
