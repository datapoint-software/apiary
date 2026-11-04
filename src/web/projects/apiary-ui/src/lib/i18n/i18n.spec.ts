import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';
import { currentLanguage } from './language';
import { provideTranslations } from './translations';

const routeTexts = { 'Save route': 'Guardar rota', 'Delete {name}?': 'Eliminar {name}?' };

function i18n(...providers: ReturnType<typeof provideTranslations>[]): I18n {
  TestBed.configureTestingModule({ providers });
  return TestBed.inject(I18n);
}

describe('I18n', () => {
  afterEach(() => currentLanguage.set('en'));

  it('shows English text as it is', () => {
    expect(i18n(provideTranslations('pt-PT', routeTexts)).t('Save route')).toBe('Save route');
  });

  it('translates text into the current language', () => {
    const texts = i18n(provideTranslations('pt-PT', routeTexts));
    texts.use('pt-PT');

    expect(texts.t('Save route')).toBe('Guardar rota');
  });

  it('shows text without a translation in English', () => {
    const texts = i18n(provideTranslations('pt-PT', routeTexts));
    texts.use('pt-PT');

    expect(texts.t('Add certificate')).toBe('Add certificate');
  });

  it('translates the library’s own text', () => {
    const texts = i18n();
    texts.use('pt-PT');

    expect(texts.t('Cancel')).toBe('Cancelar');
  });

  it('keeps the library’s own text when an app adds translations', () => {
    const texts = i18n(provideTranslations('pt-PT', routeTexts));
    texts.use('pt-PT');

    expect(texts.t('Cancel')).toBe('Cancelar');
  });

  it('fills in a placeholder', () => {
    expect(i18n().t('Delete {name}?', { name: 'shop.example.com' })).toBe(
      'Delete shop.example.com?',
    );
  });

  it('fills in a placeholder in the translation', () => {
    const texts = i18n(provideTranslations('pt-PT', routeTexts));
    texts.use('pt-PT');

    expect(texts.t('Delete {name}?', { name: 'shop.example.com' })).toBe(
      'Eliminar shop.example.com?',
    );
  });

  it('fills in a placeholder in text without a translation', () => {
    const texts = i18n();
    texts.use('pt-PT');

    expect(texts.t('Renew {name}', { name: 'shop.example.com' })).toBe('Renew shop.example.com');
  });

  it('fills in a number', () => {
    expect(i18n().t('{count} routes', { count: 3 })).toBe('3 routes');
  });

  it('leaves a placeholder without a value as it is', () => {
    expect(i18n().t('Delete {name}?')).toBe('Delete {name}?');
  });

  it('switches the language of the document', () => {
    const texts = i18n();

    texts.use('pt-PT');

    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('pt-PT');
  });

  it('reports the current language', () => {
    const texts = i18n();

    texts.use('pt-PT');

    expect(texts.language()).toBe('pt-PT');
  });

  it.each([
    [1, '1 route'],
    [0, '0 routes'],
    [2, '2 routes'],
  ])('chooses the English plural form for %d', (count, expected) => {
    expect(i18n().plural(count, '{count} route', '{count} routes')).toBe(expected);
  });

  it('chooses the Portuguese plural form by Portuguese rules', () => {
    const texts = i18n(
      provideTranslations('pt-PT', {
        '{count} route': '{count} rota',
        '{count} routes': '{count} rotas',
      }),
    );
    texts.use('pt-PT');

    expect(texts.plural(0, '{count} route', '{count} routes')).toBe('0 rotas');
  });

  it('fills in other placeholders alongside the count', () => {
    expect(
      i18n().plural(2, 'Fix {count} problem to {verb}', 'Fix {count} problems to {verb}', {
        verb: 'save',
      }),
    ).toBe('Fix 2 problems to save');
  });
});
