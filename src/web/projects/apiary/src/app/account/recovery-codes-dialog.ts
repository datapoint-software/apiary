import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@datapoint/apiary-ui';
import { RecoveryCodes } from '../auth/recovery-codes';

@Component({
  selector: 'ap-recovery-codes-dialog',
  imports: [RecoveryCodes, TranslatePipe],
  template: `
    <div class="ap-dialog" role="dialog" aria-labelledby="codes-title">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="codes-title">{{ 'Your new recovery codes' | t }}</h2></div>
      <div class="ap-dialog-body">
        <ap-recovery-codes [codes]="codes" (done)="dialog.close()" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCodesDialog {
  protected readonly codes = inject<readonly string[]>(DIALOG_DATA);
  protected readonly dialog = inject(DialogRef);
}
