import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, Icon, TranslatePipe } from '@datapoint/apiary-ui';
import { Lock } from 'lucide';
import { RouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { RouteGroup } from './route-group';
import { routeLabel, targetLabel } from './route-label';
import { RouteRowActions } from './route-row-actions';
import { perMinute } from './route-status';
import { RouteStatusLabel } from './route-status-label';

@Component({
  selector: 'ap-route-table',
  imports: [Icon, RouterLink, RouteStatusLabel, RouteRowActions, TranslatePipe],
  templateUrl: './route-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteTable {
  readonly groups = input.required<readonly RouteGroup[]>();
  readonly grouped = input(true);
  readonly selected = model<ReadonlySet<string>>(new Set());
  protected readonly auth = inject(Auth);
  private readonly i18n = inject(I18n);
  protected readonly routeLabel = routeLabel;
  protected readonly timeAgo = timeAgo;
  protected readonly perMinute = perMinute;
  protected readonly lockIcon = Lock;
  private readonly routes = computed(() => this.groups().flatMap((g) => g.routes));
  protected readonly allSelected = computed(() => this.routes().length > 0 && this.routes().every((r) => this.selected().has(r.id)));
  protected readonly someSelected = computed(() => !this.allSelected() && this.routes().some((r) => this.selected().has(r.id)));
  protected readonly columns = computed(() => (this.auth.canOperate() ? 8 : 7));

  protected toggle(route: RouteView, on: boolean): void {
    const next = new Set(this.selected());
    if (on) {
      next.add(route.id);
    } else {
      next.delete(route.id);
    }
    this.selected.set(next);
  }

  protected targetLabel(route: RouteView): string {
    return targetLabel(route, this.i18n);
  }

  protected groupMeta(group: RouteGroup): string {
    const requests = perMinute(group.routes.reduce((sum, r) => sum + (r.disabled ? 0 : r.requestsPerMinute), 0));
    return this.i18n.plural(group.routes.length, '{count} route · {requests} req/min', '{count} routes · {requests} req/min', { requests });
  }

  protected toggleAll(on: boolean): void {
    this.selected.set(on ? new Set(this.routes().map((r) => r.id)) : new Set());
  }
}
