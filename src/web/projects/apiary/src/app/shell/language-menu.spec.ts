import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18n, Toaster, provideTranslations } from '@datapoint/apiary-ui';
import { Auth } from '../auth/auth';
import { nextRequest } from '../testing/backend';
import { aSignedInUser } from '../testing/builders';
import { settle } from '../testing/dom';
import { LanguageMenu } from './language-menu';
import { shellPortuguese } from './shell.pt';

interface Rendered {
  readonly fixture: ComponentFixture<LanguageMenu>;
  readonly backend: HttpTestingController;
}

async function render(signedIn = true): Promise<Rendered> {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslations('pt-PT', shellPortuguese),
    ],
  });
  TestBed.inject(Auth).user.set(signedIn ? aSignedInUser() : null);
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(LanguageMenu);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController) };
}

function trigger(fixture: ComponentFixture<LanguageMenu>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
}

async function choose(fixture: ComponentFixture<LanguageMenu>, name: string): Promise<void> {
  trigger(fixture).click();
  await settle(fixture);
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find(
    (e) => e.textContent?.trim() === name,
  ) as HTMLElement;
  item.click();
  await settle(fixture);
}

describe('LanguageMenu', () => {
  afterEach(() => {
    TestBed.inject(I18n).use('en');
    localStorage.clear();
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.remove());
  });

  it('names the current language', async () => {
    const { fixture } = await render();

    expect(trigger(fixture).getAttribute('aria-label')).toBe('Language: English, EN');
  });

  it('switches the language and confirms it in the new language', async () => {
    const { fixture, backend } = await render(false);

    await choose(fixture, 'Português');

    expect([TestBed.inject(I18n).language(), TestBed.inject(Toaster).toasts()[0].text]).toEqual([
      'pt-PT',
      'Idioma alterado para Português.',
    ]);
    backend.expectNone('/api/account/set-language');
  });

  it('saves the language on the account of the person signed in', async () => {
    const { fixture, backend } = await render();

    await choose(fixture, 'Português');
    const request = await nextRequest(backend, '/api/account/set-language');

    expect(request.request.body).toEqual({ language: 'pt-PT' });
  });

  it('does nothing when the current language is chosen', async () => {
    const { fixture } = await render(false);

    await choose(fixture, 'English');

    expect(TestBed.inject(Toaster).toasts()).toEqual([]);
  });
});
