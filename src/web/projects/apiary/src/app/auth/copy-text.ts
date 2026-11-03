import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Button, Icon } from '@datapoint/apiary-ui';
import { Check, Copy } from 'lucide';

@Component({
  selector: 'ap-copy-text',
  imports: [Button, Icon],
  template: `
    <div class="ap-copy" [style.align-items]="multiline() ? 'flex-start' : null">
      <code [style.white-space]="multiline() ? 'pre' : null" [style.line-height]="multiline() ? '1.6' : null">{{ text() }}</code>
      <button apButton size="small" type="button" (click)="copy()">
        <ap-icon [icon]="copied() ? checkIcon : copyIcon" /><span>{{ copied() ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyText {
  readonly text = input.required<string>();
  readonly multiline = input(false);
  protected readonly copied = signal(false);
  protected readonly copyIcon = Copy;
  protected readonly checkIcon = Check;

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
