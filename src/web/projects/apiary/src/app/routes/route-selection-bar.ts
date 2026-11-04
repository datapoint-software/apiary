import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Button, Icon, TranslatePipe } from '@datapoint/apiary-ui';
import { Eraser, FolderInput, Trash2 } from 'lucide';
import { RouteView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { MoveRoutesDialog } from './move-routes-dialog';
import { RouteActions } from './route-actions';

@Component({
  selector: 'ap-route-selection-bar',
  imports: [WriteLock, Button, Icon, TranslatePipe],
  template: `
    <div class="ap-selectbar" role="region" [attr.aria-label]="'Selected routes' | t">
      <strong>{{ '{count} selected' | t: { count: routes().length } }}</strong>
      <button apWrite apButton size="small" type="button" (click)="purge()"><ap-icon [icon]="icons.purge" />{{ 'Purge cache' | t }}</button>
      <button apWrite apButton size="small" type="button" (click)="move()"><ap-icon [icon]="icons.move" />{{ 'Move to project…' | t }}</button>
      <button apWrite apButton size="small" type="button" style="color: var(--critical)" (click)="delete()"><ap-icon [icon]="icons.delete" />{{ 'Delete…' | t }}</button>
      <button apButton="ghost" size="small" type="button" style="margin-left: auto; background: none" (click)="cleared.emit()">{{ 'Clear selection' | t }}</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteSelectionBar {
  readonly routes = input.required<readonly RouteView[]>();
  readonly cleared = output();
  private readonly dialog = inject(Dialog);
  private readonly actions = inject(RouteActions);
  protected readonly icons = { move: FolderInput, delete: Trash2, purge: Eraser };

  protected async move(): Promise<void> {
    const moved = await openDialog<boolean, readonly RouteView[]>(this.dialog, MoveRoutesDialog, this.routes());
    if (moved) {
      this.cleared.emit();
    }
  }

  protected async purge(): Promise<void> {
    if (await this.actions.purge(this.routes())) {
      this.cleared.emit();
    }
  }

  protected async delete(): Promise<void> {
    if (await this.actions.deleteMany(this.routes())) {
      this.cleared.emit();
    }
  }
}
