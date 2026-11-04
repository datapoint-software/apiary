import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { CopyText } from './copy-text';

@Component({
  selector: 'ap-recovery-codes',
  imports: [CopyText, Button, TranslatePipe],
  template: `
    <p style="margin: 0">
      {{ 'If you lose your phone, each of these codes signs you in once. Store them somewhere safe, apart from your phone. You won’t see them again.' | t }}
    </p>
    <ap-copy-text [text]="text()" [multiline]="true" />
    <button apButton="primary" class="ap-btn-lg" type="button" (click)="done.emit()">{{ 'I saved them' | t }}</button>
  `,
  host: { class: 'ap-stack', style: 'gap: 16px' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCodes {
  readonly codes = input.required<readonly string[]>();
  readonly done = output();
  protected readonly text = computed(() => this.codes().join('\n'));
}
