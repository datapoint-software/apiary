import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ap-empty-state',
  template: `<div class="ap-empty">
    <div class="ap-empty-mark" aria-hidden="true"></div>
    <h2 class="ap-h ap-h-2">{{ heading() }}</h2>
    <p><ng-content /></p>
    <ng-content select="[emptyActions]" />
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly heading = input.required<string>();
}
