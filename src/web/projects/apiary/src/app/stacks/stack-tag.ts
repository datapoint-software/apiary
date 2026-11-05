import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, TranslatePipe } from '@datapoint/apiary-ui';
import { Layers, Lock } from 'lucide';

@Component({
  selector: 'ap-stack-tag',
  imports: [Icon, RouterLink, TranslatePipe],
  template: `
    @if (stack(); as name) {
      <span class="ap-caption ap-stack-tag">
        <ap-icon [icon]="locked() ? lockIcon : stackIcon" />{{
          (locked() ? 'Set in stack' : 'Declared in stack') | t
        }}
        <a class="ap-data" [routerLink]="['/stacks', name]">{{ name }}</a>
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackTag {
  readonly stack = input<string>();
  readonly locked = input(false);
  protected readonly stackIcon = Layers;
  protected readonly lockIcon = Lock;
}
