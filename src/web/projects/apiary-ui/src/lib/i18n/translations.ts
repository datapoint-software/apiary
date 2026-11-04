import { InjectionToken, Provider } from '@angular/core';
import { Language } from './language';

export type TextCatalog = Readonly<Record<string, string>>;

export interface Translation {
  readonly language: Language;
  readonly catalog: TextCatalog;
}

export const TRANSLATIONS = new InjectionToken<readonly Translation[]>('TRANSLATIONS', { factory: () => [] });

export function provideTranslations(language: Language, catalog: TextCatalog): Provider {
  return { provide: TRANSLATIONS, useValue: { language, catalog }, multi: true };
}
