import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { CopyText } from '../auth/copy-text';

export interface InviteLinkData {
  readonly heading: string;
  readonly email: string;
  readonly url: string;
  readonly renewed: boolean;
}

@Component({
  selector: 'ap-invite-link-dialog',
  imports: [Button, CopyText, TranslatePipe],
  template: `
    <div class="ap-dialog" role="dialog" aria-labelledby="link-title">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="link-title">{{ data.heading }}</h2></div>
      <div class="ap-dialog-body">
        <p style="margin: 0">
          {{ 'Send this link to {email} over a channel you trust. Anyone with it can create the account, and it works once, for 72 hours.' | t: { email: data.email } }}
        </p>
        <ap-copy-text [text]="data.url" />
        @if (data.renewed) {
          <p class="ap-caption" style="margin: 0">{{ 'The previous link no longer works.' | t }}</p>
        }
      </div>
      <div class="ap-dialog-foot">
        <button apButton="primary" type="button" (click)="dialog.close()" cdkFocusInitial>{{ 'Done' | t }}</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteLinkDialog {
  protected readonly data = inject<InviteLinkData>(DIALOG_DATA);
  protected readonly dialog = inject(DialogRef);
}
