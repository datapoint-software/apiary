import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type Tone = 'ok' | 'info' | 'warn' | 'critical' | 'off';

@Component({
  selector: 'ap-status',
  template: `<span class="ap-status" [class]="'ap-status-' + tone()"><span class="ap-dot" aria-hidden="true"></span><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Status {
  readonly tone = input<Tone>('ok');
}
