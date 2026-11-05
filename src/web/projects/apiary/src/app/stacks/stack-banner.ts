import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, TranslatePipe } from '@datapoint/apiary-ui';
import { StackSource } from '../api/models';

@Component({
  selector: 'ap-stack-banner',
  imports: [Banner, Button, RouterLink, TranslatePipe],
  template: `
    @if (source(); as from) {
      <ap-banner tone="info" [heading]="'Declared in stack {stack}' | t: { stack: from.stack }">
        {{ text() | t: { service: from.service } }}
        <a bannerActions apButton size="small" [routerLink]="['/stacks', from.stack]">{{
          'Open the stack' | t
        }}</a>
      </ap-banner>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackBanner {
  readonly source = input<StackSource>();
  readonly text = input.required<string>();
}
