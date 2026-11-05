import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { NewPipelineToken } from '../api/models';
import { CopyText } from '../auth/copy-text';

@Component({
  selector: 'ap-token-value-dialog',
  imports: [Button, CopyText, TranslatePipe],
  template: `
    <div class="ap-dialog" role="dialog" aria-labelledby="token-title">
      <div class="ap-dialog-head">
        <h2 class="ap-h ap-h-2" id="token-title">{{ 'Token {name}' | t: { name: data.name } }}</h2>
      </div>
      <div class="ap-dialog-body">
        <p style="margin: 0">
          {{ 'Store it as a masked, protected CI variable named' | t }}
          <span class="ap-data">APIARY_TOKEN</span
          >{{ '. You won’t see it again: Apiary keeps only a hash.' | t }}
        </p>
        <ap-copy-text [text]="data.token" />
        <p class="ap-caption" style="margin: 0">
          {{
            'Anyone with it can change or remove the routes of {stack} until {date}. If it leaks, revoke it.'
              | t: { stack: data.stack, date: data.expiresAt.slice(0, 10) }
          }}
        </p>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="primary" type="button" (click)="dialog.close()" cdkFocusInitial>
          {{ 'I stored it' | t }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenValueDialog {
  protected readonly data = inject<NewPipelineToken>(DIALOG_DATA);
  protected readonly dialog = inject(DialogRef);
}
