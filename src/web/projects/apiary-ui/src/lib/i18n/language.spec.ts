import { browserLanguage, supportedLanguage } from './language';

describe('supportedLanguage', () => {
  it.each([
    ['en', 'en'],
    ['en-GB', 'en'],
    ['EN-us', 'en'],
    ['pt', 'pt-PT'],
    ['pt-PT', 'pt-PT'],
    ['pt-BR', 'pt-PT'],
  ])('maps %j to %s', (value, language) => {
    expect(supportedLanguage(value)).toBe(language);
  });

  it.each([[''], [null], [undefined], ['fr'], ['english'], ['ptx']])(
    'does not support %j',
    (value) => {
      expect(supportedLanguage(value)).toBeUndefined();
    },
  );
});

describe('browserLanguage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the first supported browser language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'pt-PT', 'en']);

    expect(browserLanguage()).toBe('pt-PT');
  });

  it('falls back to English when no browser language is supported', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de']);

    expect(browserLanguage()).toBe('en');
  });
});
