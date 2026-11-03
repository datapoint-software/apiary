import { InjectionToken, Service, inject } from '@angular/core';
import { defaultMessages } from './default-messages';
import { MessageCatalog, MessageParams } from './message-catalog';

export const ERROR_MESSAGES = new InjectionToken<readonly MessageCatalog[]>('ERROR_MESSAGES', {
  factory: () => [],
});

@Service()
export class ErrorMessages {
  private readonly catalog: MessageCatalog = Object.assign({}, defaultMessages, ...inject(ERROR_MESSAGES));

  describe(code: string, params: MessageParams = {}): string {
    const message = this.catalog[code];
    return message ? message(params) : `Something went wrong (${code}).`;
  }

  has(code: string): boolean {
    return code in this.catalog;
  }
}
