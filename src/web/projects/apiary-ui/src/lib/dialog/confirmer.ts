import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';
import { Confirmation } from './confirmation';

@Service()
export class Confirmer {
  private readonly dialog = inject(Dialog);

  async confirm(confirmation: Confirmation): Promise<boolean> {
    const ref = this.dialog.open<boolean, Confirmation>(ConfirmDialog, {
      data: confirmation,
      backdropClass: 'ap-dialog-backdrop',
      panelClass: 'ap-dialog-pane',
      ariaModal: true,
      role: 'alertdialog',
    });
    return (await firstValueFrom(ref.closed)) === true;
  }
}
