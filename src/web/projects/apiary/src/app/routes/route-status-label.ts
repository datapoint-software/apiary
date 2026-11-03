import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Status } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';
import { routeStatus, upcomingMaintenance } from './route-status';

@Component({
  selector: 'ap-route-status',
  imports: [Status],
  template: `
    <ap-status [tone]="status()[0]">{{ status()[1] }}</ap-status>
    @if (upcoming()) {
      <span class="ap-caption">Maintenance {{ upcoming() }} UTC</span>
    }
  `,
  host: { class: 'ap-cell-main' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteStatusLabel {
  readonly route = input.required<RouteView>();
  protected readonly status = computed(() => routeStatus(this.route()));
  protected readonly upcoming = computed(() => upcomingMaintenance(this.route()));
}
