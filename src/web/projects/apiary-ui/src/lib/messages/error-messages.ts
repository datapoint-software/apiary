import { InjectionToken, Service, inject } from '@angular/core';
import { Language, currentLanguage } from '../i18n/language';
import { defaultMessages } from './default-messages';
import { MessageCatalog, MessageParams } from './message-catalog';

export interface LocalizedMessages {
  readonly language: Language;
  readonly catalog: MessageCatalog;
}

export const ERROR_MESSAGES = new InjectionToken<readonly LocalizedMessages[]>('ERROR_MESSAGES', {
  factory: () => [],
});

@Service()
export class ErrorMessages {
  private readonly catalogs = new Map<Language, MessageCatalog>([['en', defaultMessages]]);

  constructor() {
    for (const { language, catalog } of inject(ERROR_MESSAGES)) {
      this.catalogs.set(language, { ...this.catalogs.get(language), ...catalog });
    }
  }

  describe(code: string, params: MessageParams = {}): string {
    const message = this.catalogs.get(currentLanguage())?.[code] ?? this.catalogs.get('en')?.[code];
    if (message) {
      return message(params);
    }
    return currentLanguage() === 'pt-PT' ? `Algo correu mal (${code}).` : `Something went wrong (${code}).`;
  }

  has(code: string): boolean {
    return code in (this.catalogs.get('en') ?? {});
  }
}
