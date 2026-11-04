import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Button } from '../button/button';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'ap-password-reveal',
  imports: [Button, TranslatePipe],
  template: `
    <button
        apButton="ghost"
        size="small"
        type="button"
        [attr.aria-pressed]="shown()"
        [attr.aria-label]="(shown() ? 'Hide {name}' : 'Show {name}') | t: { name: label() ?? ('password' | t) }"
        style="height: 26px; padding: 0 8px"
        (click)="toggle()"
      >
        {{ (shown() ? 'Hide' : 'Show') | t }}
      </button>
  `,
  host: { class: 'ap-affix-text', style: 'padding: 0 3px' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordReveal {
  readonly target = input.required<HTMLInputElement>();
  readonly label = input<string>();
  protected readonly shown = signal(false);

  protected toggle(): void {
    this.shown.update((shown) => !shown);
    this.target().type = this.shown() ? 'text' : 'password';
  }
}
