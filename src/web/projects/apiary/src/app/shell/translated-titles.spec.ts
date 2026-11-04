import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { I18n, provideTranslations } from '@datapoint/apiary-ui';
import { shellPortuguese } from './shell.pt';
import { TranslatedTitles } from './translated-titles';

@Component({ template: '' })
class Page {}

async function visit(url: string): Promise<Title> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'routes', component: Page, title: 'All routes · Apiary' },
        { path: 'untitled', component: Page },
      ]),
      { provide: TitleStrategy, useExisting: TranslatedTitles },
      provideTranslations('pt-PT', shellPortuguese),
    ],
  });
  TestBed.inject(I18n).use('en');
  const title = TestBed.inject(Title);
  title.setTitle('Before');
  await TestBed.inject(Router).navigateByUrl(url);
  return title;
}

describe('TranslatedTitles', () => {
  afterEach(() => TestBed.inject(I18n).use('en'));

  it('sets the page title', async () => {
    const title = await visit('/routes');

    expect(title.getTitle()).toBe('All routes · Apiary');
  });

  it('translates each part of the title when the language changes', async () => {
    const title = await visit('/routes');

    TestBed.inject(I18n).use('pt-PT');
    TestBed.tick();

    expect(title.getTitle()).toBe('Todas as rotas · Apiary');
  });

  it('leaves the title alone for a page without one', async () => {
    const title = await visit('/untitled');

    expect(title.getTitle()).toBe('Before');
  });
});
