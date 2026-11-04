import { DOCUMENT, Service, inject } from '@angular/core';
import { Language, currentLanguage } from './language';
import { portuguese } from './portuguese';
import { TRANSLATIONS, TextCatalog } from './translations';

export type TextParams = Readonly<Record<string, string | number>>;

@Service()
export class I18n {
  readonly language = currentLanguage.asReadonly();
  private readonly document = inject(DOCUMENT);
  private readonly catalogs = new Map<Language, TextCatalog>([['pt-PT', portuguese]]);

  constructor() {
    for (const { language, catalog } of inject(TRANSLATIONS)) {
      this.catalogs.set(language, { ...this.catalogs.get(language), ...catalog });
    }
  }

  use(language: Language): void {
    currentLanguage.set(language);
    this.document.documentElement.lang = language;
  }

  t(text: string, params: TextParams = {}): string {
    const translated = this.catalogs.get(currentLanguage())?.[text] ?? text;
    return translated.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  }

  plural(count: number, one: string, other: string, params: TextParams = {}): string {
    const form = new Intl.PluralRules(currentLanguage()).select(count) === 'one' ? one : other;
    return this.t(form, { count, ...params });
  }
}
