import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TwoStepEnrollment } from '../api/models';
import { CopyText } from './copy-text';
import { QrCode } from './qr-code';

@Component({
  selector: 'ap-two-step-setup',
  imports: [QrCode, CopyText],
  template: `
    <p style="margin: 0">Scan the code with your authenticator app, then enter the 6-digit code it shows.</p>
    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
      <ap-qr-code [value]="enrollment().uri" />
      <div class="ap-stack" style="gap: 6px; flex: 1; min-width: 180px">
        <span class="ap-caption">Can’t scan it? Enter this key:</span>
        <ap-copy-text [text]="key()" [multiline]="true" />
      </div>
    </div>
  `,
  host: { class: 'ap-stack', style: 'gap: 16px' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoStepSetup {
  readonly enrollment = input.required<TwoStepEnrollment>();
  protected readonly key = computed(() => (this.enrollment().secret.match(/.{1,16}/g) ?? []).map((line) => line.match(/.{1,4}/g)?.join(' ')).join('\n'));
}
