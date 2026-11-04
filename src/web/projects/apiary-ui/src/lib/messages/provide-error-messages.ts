import { Provider } from '@angular/core';
import { Language } from '../i18n/language';
import { ERROR_MESSAGES } from './error-messages';
import { MessageCatalog } from './message-catalog';

export function provideErrorMessages(catalog: MessageCatalog, language: Language = 'en'): Provider {
  return { provide: ERROR_MESSAGES, useValue: { language, catalog }, multi: true };
}
