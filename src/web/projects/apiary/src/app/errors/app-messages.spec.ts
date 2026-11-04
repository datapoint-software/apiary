import { TestBed } from '@angular/core/testing';
import { ErrorMessages, currentLanguage, provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from './app-messages';
import { appMessagesPortuguese } from './app-messages.pt';

function messages(): ErrorMessages {
  TestBed.configureTestingModule({
    providers: [
      provideErrorMessages(appMessages),
      provideErrorMessages(appMessagesPortuguese, 'pt-PT'),
    ],
  });
  return TestBed.inject(ErrorMessages);
}

afterEach(() => currentLanguage.set('en'));

describe('app messages', () => {
  it('describes an API error code', () => {
    expect(messages().describe('route.duplicate')).toBe(
      'Another route already uses this hostname and path. Change one of them.',
    );
  });

  it('puts the API’s values into the message', () => {
    expect(messages().describe('auth.throttled', { retryAfter: 30 })).toBe(
      'Too many tries. Wait 30 seconds, then try again.',
    );
  });

  it('says what the weights add up to when the API tells', () => {
    expect(messages().describe('route.weightsTotal', { total: 90 })).toBe(
      'The weights add up to 90%. Make them add up to 100%.',
    );
  });

  it('asks for weights that add up to 100% when the total isn’t known', () => {
    expect(messages().describe('route.weightsTotal')).toBe('Make the weights add up to 100%.');
  });

  it('describes an error code in Portuguese', () => {
    const catalog = messages();
    currentLanguage.set('pt-PT');

    expect(catalog.describe('validation.failed')).toBe('Alguns campos precisam de atenção.');
  });

  it('has no Portuguese message for a code that has no English one', () => {
    const english = Object.keys(appMessages);

    expect(Object.keys(appMessagesPortuguese).filter((code) => !english.includes(code))).toEqual(
      [],
    );
  });

  it.each(Object.keys(appMessages))('has a Portuguese message for %s', (code) => {
    const catalog = messages();
    const english = catalog.describe(code, { total: 90, retryAfter: 30, min: 1, max: 9 });
    currentLanguage.set('pt-PT');

    expect(catalog.describe(code, { total: 90, retryAfter: 30, min: 1, max: 9 })).not.toBe(english);
  });
});
