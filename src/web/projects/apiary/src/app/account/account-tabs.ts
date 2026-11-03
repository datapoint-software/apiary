import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'ap-account-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="ap-tabs" aria-label="Account">
      @for (tab of tabs; track tab.link) {
        <a class="ap-tab" [routerLink]="tab.link" routerLinkActive ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: true }">
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTabs {
  protected readonly tabs = [
    { link: '/account', label: 'Profile' },
    { link: '/account/security', label: 'Security' },
    { link: '/account/sessions', label: 'Active sessions' },
  ];
}
