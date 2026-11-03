import { Provider } from '@angular/core';
import { ERROR_MESSAGES } from './error-messages';
import { MessageCatalog } from './message-catalog';

export function provideErrorMessages(catalog: MessageCatalog): Provider {
  return { provide: ERROR_MESSAGES, useValue: catalog, multi: true };
}
