import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { I18n } from '@datapoint/apiary-ui';
import { nextRequest } from '../testing/backend';
import { LanguageChoice } from './language-choice';

function setUp() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const i18n = TestBed.inject(I18n);
  i18n.use('en');
  return {
    choice: TestBed.inject(LanguageChoice),
    i18n,
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('LanguageChoice', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    TestBed.inject(I18n).use('en');
  });

  it('starts in the language chosen before in this browser', () => {
    localStorage.setItem('apiary.language', 'pt-PT');
    const { choice, i18n } = setUp();

    choice.start();

    expect(i18n.language()).toBe('pt-PT');
  });

  it('starts in the browser’s language when the stored one can’t be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pt-BR', 'en']);
    const { choice, i18n } = setUp();

    choice.start();

    expect(i18n.language()).toBe('pt-PT');
  });

  it('follows the language saved on the account', () => {
    const { choice, i18n } = setUp();

    choice.follow('pt-PT');

    expect([i18n.language(), localStorage.getItem('apiary.language')]).toEqual(['pt-PT', 'pt-PT']);
  });

  it('ignores a language it doesn’t offer', () => {
    const { choice, i18n } = setUp();

    choice.follow('fr');

    expect(i18n.language()).toBe('en');
  });

  it('carries on when the browser refuses to remember the choice', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { choice, i18n } = setUp();

    await choice.choose('pt-PT', false);

    expect(i18n.language()).toBe('pt-PT');
  });

  it('saves the choice on the account when signed in', async () => {
    const { choice, backend } = setUp();

    const choosing = choice.choose('pt-PT', true);
    const request = await nextRequest(backend, '/api/account/set-language');
    request.flush(null);
    await choosing;

    expect(request.request.body).toEqual({ language: 'pt-PT' });
  });
});
