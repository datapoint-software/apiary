import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18n, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';
import { routeStatus, upcomingMaintenance } from './route-status';

@Component({
  selector: 'ap-route-status',
  imports: [Status, TranslatePipe],
  template: `
    <ap-status [tone]="status()[0]">{{ status()[1] }}</ap-status>
    @if (upcoming()) {
      <span class="ap-caption">{{ 'Maintenance {time} UTC' | t: { time: upcoming() } }}</span>
    }
  `,
  host: { class: 'ap-cell-main' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteStatusLabel {
  readonly route = input.required<RouteView>();
  private readonly i18n = inject(I18n);
  protected readonly status = computed(() => routeStatus(this.route(), this.i18n));
  protected readonly upcoming = computed(() => upcomingMaintenance(this.route()));
}
