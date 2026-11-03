import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Button, Icon } from '@datapoint/apiary-ui';
import { FolderInput, Trash2 } from 'lucide';
import { RouteView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { MoveRoutesDialog } from './move-routes-dialog';
import { RouteActions } from './route-actions';

@Component({
  selector: 'ap-route-selection-bar',
  imports: [WriteLock, Button, Icon],
  template: `
    <div class="ap-selectbar" role="region" aria-label="Selected routes">
      <strong>{{ routes().length }} selected</strong>
      <button apWrite apButton size="small" type="button" (click)="move()"><ap-icon [icon]="icons.move" />Move to project…</button>
      <button apWrite apButton size="small" type="button" style="color: var(--critical)" (click)="delete()"><ap-icon [icon]="icons.delete" />Delete…</button>
      <button apButton="ghost" size="small" type="button" style="margin-left: auto; background: none" (click)="cleared.emit()">Clear selection</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteSelectionBar {
  readonly routes = input.required<readonly RouteView[]>();
  readonly cleared = output();
  private readonly dialog = inject(Dialog);
  private readonly actions = inject(RouteActions);
  protected readonly icons = { move: FolderInput, delete: Trash2 };

  protected async move(): Promise<void> {
    const moved = await openDialog<boolean, readonly RouteView[]>(this.dialog, MoveRoutesDialog, this.routes());
    if (moved) {
      this.cleared.emit();
    }
  }

  protected async delete(): Promise<void> {
    if (await this.actions.deleteMany(this.routes())) {
      this.cleared.emit();
    }
  }
}
