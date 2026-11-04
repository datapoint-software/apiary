import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from '@datapoint/apiary-ui';
import { CopyText } from '../auth/copy-text';

export interface RouteAccessData {
  readonly label: string;
  readonly password?: string;
  readonly link?: string;
  readonly hasLink: boolean;
}

@Component({
  selector: 'ap-route-access-dialog',
  imports: [Button, CopyText],
  template: `
    <div class="ap-dialog" role="dialog" aria-labelledby="access-title">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="access-title">{{ data.label }} saved</h2></div>
      <div class="ap-dialog-body">
        <p style="margin: 0">
          @if (data.password && data.link) {
            Visitors need the password now, or the sign-in link. Copy them: they’re shown only this once.
          } @else if (data.link) {
            Here’s the new sign-in link. Copy it: it’s shown only this once, and any old one no longer works.
          } @else {
            Visitors need the password now. Copy it: it’s shown only this once.
          }
        </p>
        @if (data.link) {
          <div class="ap-field"><span class="ap-label">Sign-in link</span><ap-copy-text [text]="data.link" /></div>
        }
        @if (data.password) {
          <div class="ap-field"><span class="ap-label">Password</span><ap-copy-text [text]="data.password" /></div>
        }
        <p class="ap-caption" style="margin: 0">
          Send {{ data.password && data.link ? 'them' : 'it' }} over a channel you trust. Anyone who has {{ data.password && data.link ? 'either' : 'it' }} gets
          in until you set a new password{{ data.hasLink ? ' or make a new link' : '' }}.
        </p>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="primary" type="button" (click)="dialog.close()" cdkFocusInitial>Done</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteAccessDialog {
  protected readonly data = inject<RouteAccessData>(DIALOG_DATA);
  protected readonly dialog = inject(DialogRef);
}
