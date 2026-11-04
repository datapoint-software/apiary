import { TestBed } from '@angular/core/testing';
import { currentLanguage } from '../i18n/language';
import { defaultMessages } from './default-messages';
import { ErrorMessages } from './error-messages';
import { portugueseMessages } from './portuguese-messages';
import { provideErrorMessages } from './provide-error-messages';

const appMessages = { 'route.exists': () => 'That route already exists.' };
const appPortugueseMessages = { 'route.exists': () => 'Essa rota já existe.' };

function errorMessages(...providers: ReturnType<typeof provideErrorMessages>[]): ErrorMessages {
  TestBed.configureTestingModule({ providers });
  return TestBed.inject(ErrorMessages);
}

describe('ErrorMessages', () => {
  afterEach(() => currentLanguage.set('en'));

  it('describes a code in English', () => {
    expect(errorMessages().describe('required')).toBe('Fill this in.');
  });

  it('fills in the parameters', () => {
    expect(errorMessages().describe('range', { min: 1, max: 65535 })).toBe(
      'Enter a number from 1 to 65535.',
    );
  });

  it('describes a code in Portuguese when that is the language', () => {
    const messages = errorMessages();
    currentLanguage.set('pt-PT');

    expect(messages.describe('required')).toBe('Preencha este campo.');
  });

  it('follows a language change without being created again', () => {
    const messages = errorMessages();
    messages.describe('required');
    currentLanguage.set('pt-PT');

    expect(messages.describe('required')).toBe('Preencha este campo.');
  });

  it('describes an unknown code in English with the code', () => {
    expect(errorMessages().describe('route.unheardOf')).toBe(
      'Something went wrong (route.unheardOf).',
    );
  });

  it('describes an unknown code in Portuguese with the code', () => {
    const messages = errorMessages();
    currentLanguage.set('pt-PT');

    expect(messages.describe('route.unheardOf')).toBe('Algo correu mal (route.unheardOf).');
  });

  it('describes the codes an app provides', () => {
    expect(errorMessages(provideErrorMessages(appMessages)).describe('route.exists')).toBe(
      'That route already exists.',
    );
  });

  it('keeps the built-in codes when an app provides its own', () => {
    expect(errorMessages(provideErrorMessages(appMessages)).describe('required')).toBe(
      'Fill this in.',
    );
  });

  it('describes the Portuguese codes an app provides', () => {
    const messages = errorMessages(
      provideErrorMessages(appMessages),
      provideErrorMessages(appPortugueseMessages, 'pt-PT'),
    );
    currentLanguage.set('pt-PT');

    expect(messages.describe('route.exists')).toBe('Essa rota já existe.');
  });

  it('falls back to English when a code has no Portuguese message', () => {
    const messages = errorMessages(provideErrorMessages(appMessages));
    currentLanguage.set('pt-PT');

    expect(messages.describe('route.exists')).toBe('That route already exists.');
  });

  it('knows a built-in code', () => {
    expect(errorMessages().has('target.loopback')).toBe(true);
  });

  it('knows a code an app provides', () => {
    expect(errorMessages(provideErrorMessages(appMessages)).has('route.exists')).toBe(true);
  });

  it('does not know a code without an English message', () => {
    expect(
      errorMessages(provideErrorMessages(appPortugueseMessages, 'pt-PT')).has('route.exists'),
    ).toBe(false);
  });
});

describe('portugueseMessages', () => {
  it('words every built-in code', () => {
    expect(Object.keys(portugueseMessages).sort()).toEqual(Object.keys(defaultMessages).sort());
  });
});
