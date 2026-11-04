import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { currentLanguage } from '../i18n/language';
import { Crumb } from './crumb';
import { PageHead } from './page-head';

@Component({
  selector: 'ap-page-head-host',
  imports: [PageHead],
  template: `<ap-page-head heading="shop.example.com" [crumbs]="crumbs()">
    <span pageSub>Sends visitors to shop-v1.</span>
    <button type="button" pageActions>Edit route</button>
  </ap-page-head>`,
})
class PageHeadHost {
  readonly crumbs = signal<readonly Crumb[]>([]);
}

function aCrumb(label: string, link: string): Crumb {
  return { label, link };
}

async function render(crumbs: readonly Crumb[] = []): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PageHeadHost);
  fixture.componentInstance.crumbs.set(crumbs);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('PageHead', () => {
  afterEach(() => currentLanguage.set('en'));

  it('shows the heading as the page’s main heading', async () => {
    expect((await render()).querySelector('h1')?.textContent).toBe('shop.example.com');
  });

  it('labels the breadcrumb navigation', async () => {
    expect((await render()).querySelector('nav')?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('labels the breadcrumb navigation in Portuguese', async () => {
    currentLanguage.set('pt-PT');

    expect((await render()).querySelector('nav')?.getAttribute('aria-label')).toBe('Localização');
  });

  it('links each crumb', async () => {
    const page = await render([aCrumb('Projects', '/projects'), aCrumb('Shop', '/projects/shop')]);

    expect(
      [...page.querySelectorAll('nav a')].map((link) => [
        link.textContent,
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['Projects', '/projects'],
      ['Shop', '/projects/shop'],
    ]);
  });

  it('ends the breadcrumb with the current page', async () => {
    const page = await render([aCrumb('Projects', '/projects')]);

    expect(page.querySelector('nav [aria-current="page"]')?.textContent).toBe('shop.example.com');
  });

  it('hides the crumb separators from assistive technology', async () => {
    const page = await render([aCrumb('Projects', '/projects')]);

    expect(page.querySelector('nav span:not([aria-current])')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('shows the subtitle and actions', async () => {
    const page = await render();

    expect([
      page.querySelector('.ap-sub')?.textContent,
      page.querySelector('.ap-row')?.textContent,
    ]).toEqual(['Sends visitors to shop-v1.', 'Edit route']);
  });
});
