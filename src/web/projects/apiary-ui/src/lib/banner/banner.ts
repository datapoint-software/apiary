import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide';
import { Icon } from '../icon/icon';

export type BannerTone = 'info' | 'ok' | 'warn' | 'critical';

const icons = { info: Info, ok: CircleCheck, warn: TriangleAlert, critical: CircleAlert };

@Component({
  selector: 'ap-banner',
  imports: [Icon],
  template: `<div class="ap-banner" [class]="'ap-banner-' + tone()" [attr.role]="role()">
    <ap-icon [icon]="icon()" />
    <div class="ap-banner-body">
      @if (heading()) {
        <span class="ap-banner-title">{{ heading() }}</span>
      }
      <span><ng-content /></span>
      <div class="ap-banner-actions"><ng-content select="[bannerActions]" /></div>
    </div>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Banner {
  readonly tone = input<BannerTone>('info');
  readonly heading = input('');
  readonly role = input<'alert' | 'status' | null>(null);
  protected readonly icon = computed(() => icons[this.tone()]);
}
