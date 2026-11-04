import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState, TranslatePipe } from '@datapoint/apiary-ui';

@Component({
  selector: 'ap-not-found',
  imports: [EmptyState, RouterLink, TranslatePipe],
  template: `<section class="ap-panel">
    <ap-empty-state [heading]="'This page doesn’t exist' | t">
      {{ 'The link may be old, or the item was deleted.' | t }}
      <a emptyActions class="ap-btn ap-btn-primary" routerLink="/">{{ 'Go to the overview' | t }}</a>
    </ap-empty-state>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
