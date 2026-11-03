import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Button, Icon } from '@datapoint/apiary-ui';
import { Eraser, Pause, Play, Trash2 } from 'lucide';
import { RouteView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';
import { RouteActions } from './route-actions';
import { routeLabel } from './route-label';

@Component({
  selector: 'ap-route-row-actions',
  imports: [WriteLock, Button, Icon],
  template: `
    @let label = routeLabel(route());
    @if (route().disabled) {
      <button apWrite apButton="ghost" size="small" [iconOnly]="true" type="button" [attr.aria-label]="'Enable ' + label" (click)="actions.enable(route())">
        <ap-icon [icon]="icons.enable" />
      </button>
    } @else {
      <button apWrite apButton="ghost" size="small" [iconOnly]="true" type="button" [attr.aria-label]="'Disable ' + label" (click)="actions.disable(route())">
        <ap-icon [icon]="icons.disable" />
      </button>
    }
    @if (route().caching) {
      <button apWrite apButton="ghost" size="small" [iconOnly]="true" type="button" [attr.aria-label]="'Purge the cache of ' + label" (click)="actions.purge([route()])">
        <ap-icon [icon]="icons.purge" />
      </button>
    }
    <button apWrite apButton="ghost" size="small" [iconOnly]="true" type="button" [attr.aria-label]="'Delete ' + label" (click)="actions.delete(route())">
      <ap-icon [icon]="icons.delete" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteRowActions {
  readonly route = input.required<RouteView>();
  protected readonly actions = inject(RouteActions);
  protected readonly icons = { delete: Trash2, disable: Pause, enable: Play, purge: Eraser };
  protected readonly routeLabel = routeLabel;
}
