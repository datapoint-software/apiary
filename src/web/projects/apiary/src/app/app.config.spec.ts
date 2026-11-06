import { TestBed } from '@angular/core/testing';
import { ERROR_MESSAGES, TRANSLATIONS } from '@datapoint/apiary-ui';
import { appConfig } from './app.config';

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
}

function setUp() {
  TestBed.configureTestingModule({ providers: appConfig.providers });
}

describe('appConfig', () => {
  it('registers a Portuguese catalog for each of the 20 features', () => {
    setUp();

    expect(TestBed.inject(TRANSLATIONS).map(({ language }) => language)).toEqual(
      new Array(20).fill('pt-PT'),
    );
  });

  it('registers Portuguese texts only with placeholders their English text has', () => {
    setUp();
    const entries = TestBed.inject(TRANSLATIONS).flatMap(({ catalog }) => Object.entries(catalog));

    const unknown = entries.filter(
      ([english, portuguese]) =>
        !placeholders(portuguese).every((name) => placeholders(english).includes(name)),
    );

    expect(unknown).toEqual([]);
  });

  it('registers no empty Portuguese text', () => {
    setUp();
    const entries = TestBed.inject(TRANSLATIONS).flatMap(({ catalog }) => Object.entries(catalog));

    expect(entries.filter(([, portuguese]) => portuguese.trim() === '')).toEqual([]);
  });

  it('registers error messages in English and Portuguese', () => {
    setUp();

    expect(TestBed.inject(ERROR_MESSAGES).map(({ language }) => language)).toEqual(['en', 'pt-PT']);
  });
});
