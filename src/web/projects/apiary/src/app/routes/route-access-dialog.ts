import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { CopyText } from '../auth/copy-text';

export interface RouteAccessData {
  readonly label: string;
  readonly password?: string;
  readonly link?: string;
  readonly hasLink: boolean;
}

function sharingNote(data: RouteAccessData): string {
  if (data.password && data.link) {
    return data.hasLink
      ? 'Send them over a channel you trust. Anyone who has either gets in until you set a new password or make a new link.'
      : 'Send them over a channel you trust. Anyone who has either gets in until you set a new password.';
  }
  return data.hasLink
    ? 'Send it over a channel you trust. Anyone who has it gets in until you set a new password or make a new link.'
    : 'Send it over a channel you trust. Anyone who has it gets in until you set a new password.';
}

@Component({
  selector: 'ap-route-access-dialog',
  imports: [Button, CopyText, TranslatePipe],
  template: `
    <div class="ap-dialog" role="dialog" aria-labelledby="access-title">
      <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="access-title">{{ '{route} saved' | t: { route: data.label } }}</h2></div>
      <div class="ap-dialog-body">
        <p style="margin: 0">
          @if (data.password && data.link) {
            {{ 'Visitors need the password now, or the sign-in link. Copy them: they’re shown only this once.' | t }}
          } @else if (data.link) {
            {{ 'Here’s the new sign-in link. Copy it: it’s shown only this once, and any old one no longer works.' | t }}
          } @else {
            {{ 'Visitors need the password now. Copy it: it’s shown only this once.' | t }}
          }
        </p>
        @if (data.link) {
          <div class="ap-field"><span class="ap-label">{{ 'Sign-in link' | t }}</span><ap-copy-text [text]="data.link" /></div>
        }
        @if (data.password) {
          <div class="ap-field"><span class="ap-label">{{ 'Password' | t }}</span><ap-copy-text [text]="data.password" /></div>
        }
        <p class="ap-caption" style="margin: 0">{{ note | t }}</p>
      </div>
      <div class="ap-dialog-foot">
        <button apButton="primary" type="button" (click)="dialog.close()" cdkFocusInitial>{{ 'Done' | t }}</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteAccessDialog {
  protected readonly data = inject<RouteAccessData>(DIALOG_DATA);
  protected readonly dialog = inject(DialogRef);
  protected readonly note = sharingNote(this.data);
}
