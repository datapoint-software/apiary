import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@datapoint/apiary-ui';

@Component({
  selector: 'ap-account-tabs',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="ap-tabs" [attr.aria-label]="'Account' | t">
      @for (tab of tabs; track tab.link) {
        <a class="ap-tab" [routerLink]="tab.link" routerLinkActive ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: true }">
          {{ tab.label | t }}
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
