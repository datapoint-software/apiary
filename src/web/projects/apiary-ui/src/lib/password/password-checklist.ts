import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Circle, CircleCheck } from 'lucide';
import { Icon } from '../icon/icon';
import { passwordRules } from './password-check';

@Component({
  selector: 'ap-password-checklist',
  imports: [Icon],
  template: `
    <ul class="ap-checklist" aria-label="Password rules">
      @for (rule of rules(); track rule.label) {
        <li [attr.data-met]="rule.met ? '' : null">
          <ap-icon [icon]="rule.met ? metIcon : unmetIcon" />{{ rule.label }}<span class="ap-sr">{{ rule.met ? ', done' : ', not yet' }}</span>
        </li>
      }
    </ul>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChecklist {
  readonly password = input.required<string>();
  readonly email = input('');
  protected readonly rules = computed(() => passwordRules(this.password(), this.email()));
  protected readonly metIcon = CircleCheck;
  protected readonly unmetIcon = Circle;
}
