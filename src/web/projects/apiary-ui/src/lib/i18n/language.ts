import { signal } from '@angular/core';

export type Language = 'en' | 'pt-PT';

export const languages: readonly { readonly code: Language; readonly name: string; readonly short: string }[] = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'pt-PT', name: 'Português', short: 'PT' },
];

export const currentLanguage = signal<Language>('en');

export function supportedLanguage(value: string | null | undefined): Language | undefined {
  if (!value) {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === 'en' || lower.startsWith('en-')) {
    return 'en';
  }
  return lower === 'pt' || lower.startsWith('pt-') ? 'pt-PT' : undefined;
}

export function browserLanguage(): Language {
  return navigator.languages.map(supportedLanguage).find((language) => language !== undefined) ?? 'en';
}
