import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'ap-password-reveal',
  imports: [Button],
  template: `
    <button
        apButton="ghost"
        size="small"
        type="button"
        [attr.aria-pressed]="shown()"
        [attr.aria-label]="(shown() ? 'Hide ' : 'Show ') + label()"
        style="height: 26px; padding: 0 8px"
        (click)="toggle()"
      >
        {{ shown() ? 'Hide' : 'Show' }}
      </button>
  `,
  host: { class: 'ap-affix-text', style: 'padding: 0 3px' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordReveal {
  readonly target = input.required<HTMLInputElement>();
  readonly label = input('password');
  protected readonly shown = signal(false);

  protected toggle(): void {
    this.shown.update((shown) => !shown);
    this.target().type = this.shown() ? 'text' : 'password';
  }
}
