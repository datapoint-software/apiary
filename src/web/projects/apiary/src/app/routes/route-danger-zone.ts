import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { RouteActions } from './route-actions';

@Component({
  selector: 'ap-route-danger-zone',
  imports: [WriteLock, Button, TranslatePipe],
  template: `
    <section class="ap-panel ap-panel-danger" aria-labelledby="danger-title">
      <div class="ap-panel-head">
        <div><h2 class="ap-h ap-h-3" id="danger-title">{{ 'Danger zone' | t }}</h2></div>
      </div>
      <div class="ap-panel-body ap-list">
        <div class="ap-list-row">
          <div class="ap-list-text">
            <strong>{{ (route().disabled ? 'Enable this route' : 'Disable this route') | t }}</strong>
            <span class="ap-muted">{{ (route().disabled ? 'Traffic flows again with the saved settings.' : 'Visitors get a 503. Settings and certificate are kept.') | t }}</span>
          </div>
          <button apWrite apButton type="button" [disabled]="!auth.canOperate()" (click)="toggle()">
            {{ (route().disabled ? 'Enable route' : 'Disable route…') | t }}
          </button>
        </div>
        <div class="ap-list-row">
          <div class="ap-list-text">
            <strong>{{ 'Delete this route' | t }}</strong>
            <span class="ap-muted">{{ 'Requests to it get a 404 on every replica.' | t }}</span>
          </div>
          <button apWrite apButton type="button" style="color: var(--critical)" [disabled]="!auth.canOperate()" (click)="delete()">
            {{ 'Delete route…' | t }}
          </button>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDangerZone {
  readonly route = input.required<RouteView>();
  readonly deleted = output();
  protected readonly auth = inject(Auth);
  private readonly actions = inject(RouteActions);

  protected async toggle(): Promise<void> {
    const route = this.route();
    await (route.disabled ? this.actions.enable(route) : this.actions.disable(route));
  }

  protected async delete(): Promise<void> {
    if (await this.actions.delete(this.route())) {
      this.deleted.emit();
    }
  }
}
