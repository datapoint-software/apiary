import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, I18n, Icon, Language, Toaster, TranslatePipe, languages } from '@datapoint/apiary-ui';
import { Check, Languages } from 'lucide';
import { Auth } from '../auth/auth';
import { LanguageChoice } from '../auth/language-choice';

@Component({
  selector: 'ap-language-menu',
  imports: [Button, Icon, CdkMenu, CdkMenuItemRadio, CdkMenuTrigger, TranslatePipe],
  template: `
    <button apButton="ghost" class="ap-lang-btn" type="button" [attr.aria-label]="'Language: {name}' | t: { name: current().name + ', ' + current().short }" [cdkMenuTriggerFor]="menu">
      <ap-icon [icon]="icons.languages" /><span aria-hidden="true">{{ current().short }}</span>
    </button>
    <ng-template #menu>
      <div class="ap-menu" cdkMenu [attr.aria-label]="'Language' | t">
        @for (language of languages; track language.code) {
          <button
            class="ap-menu-item"
            cdkMenuItemRadio
            type="button"
            [lang]="language.code"
            [cdkMenuItemChecked]="language.code === i18n.language()"
            (cdkMenuItemTriggered)="choose(language.code)"
          >
            {{ language.name }}
            @if (language.code === i18n.language()) {
              <ap-icon class="ap-menu-check" [icon]="icons.check" />
            }
          </button>
        }
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageMenu {
  protected readonly i18n = inject(I18n);
  private readonly choice = inject(LanguageChoice);
  private readonly auth = inject(Auth);
  private readonly toaster = inject(Toaster);
  protected readonly languages = languages;
  protected readonly icons = { languages: Languages, check: Check };
  protected readonly current = computed(() => languages.find((l) => l.code === this.i18n.language()) ?? languages[0]);

  protected async choose(language: Language): Promise<void> {
    if (language === this.i18n.language()) {
      return;
    }
    await this.choice.choose(language, this.auth.user() !== null);
    this.toaster.show(this.i18n.t('Language set to {name}.', { name: this.current().name }));
  }
}
