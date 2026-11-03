import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '@datapoint/apiary-ui';

@Component({
  selector: 'ap-not-found',
  imports: [EmptyState, RouterLink],
  template: `<section class="ap-panel">
    <ap-empty-state heading="This page doesn’t exist">
      The link may be old, or the item was deleted.
      <a emptyActions class="ap-btn ap-btn-primary" routerLink="/">Go to the overview</a>
    </ap-empty-state>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
