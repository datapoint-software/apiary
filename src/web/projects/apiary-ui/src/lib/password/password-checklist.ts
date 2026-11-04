import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Circle, CircleCheck } from 'lucide';
import { Icon } from '../icon/icon';
import { minimumPasswordLength, passwordRules } from './password-check';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'ap-password-checklist',
  imports: [Icon, TranslatePipe],
  template: `
    <ul class="ap-checklist" [attr.aria-label]="'Password rules' | t">
      @for (rule of rules(); track rule.label) {
        <li [attr.data-met]="rule.met ? '' : null">
          <ap-icon [icon]="rule.met ? metIcon : unmetIcon" />{{ rule.label | t: { min: minimumPasswordLength } }}<span class="ap-sr">{{ (rule.met ? ', done' : ', not yet') | t }}</span>
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
  protected readonly minimumPasswordLength = minimumPasswordLength;
}
