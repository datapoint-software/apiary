import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { create } from 'qrcode';

@Component({
  selector: 'ap-qr-code',
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      width="148"
      height="148"
      role="img"
      aria-label="QR code for your authenticator app"
      style="background: #fff; border-radius: 10px; flex: none"
    >
      <path [attr.d]="path()" fill="#000" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCode {
  readonly value = input.required<string>();
  private readonly code = computed(() => create(this.value(), { errorCorrectionLevel: 'M' }).modules);
  protected readonly viewBox = computed(() => `-2 -2 ${this.code().size + 4} ${this.code().size + 4}`);
  protected readonly path = computed(() => {
    const { size, data } = this.code();
    const parts: string[] = [];
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (data[row * size + column]) {
          parts.push(`M${column} ${row}h1v1h-1z`);
        }
      }
    }
    return parts.join('');
  });
}
