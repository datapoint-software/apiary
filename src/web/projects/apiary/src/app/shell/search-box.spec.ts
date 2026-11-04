import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Role } from '../api/models';
import { Auth } from '../auth/auth';
import { aCertificate, aProject, aRoute, aSignedInUser, aUser } from '../testing/builders';
import { byLabel, settle, textOf, type } from '../testing/dom';
import { SearchBox } from './search-box';

const shopProject = aProject({ id: 'project-1', name: 'Shop', routeCount: 2 });
const shopRoute = aRoute({
  id: 'route-1',
  projectId: 'project-1',
  host: 'shop.example.com',
  path: '/cart',
});
const wildcard = aCertificate({ id: 'certificate-1', hosts: ['*.example.com', 'example.com'] });
const rui = aUser({ name: 'Rui Costa', email: 'rui@example.com' });

async function render(role: Role = 'administrator') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(SearchBox);
  await fixture.whenStable();
  return { fixture, backend: TestBed.inject(HttpTestingController) };
}

async function search(
  fixture: ComponentFixture<SearchBox>,
  backend: HttpTestingController,
  query: string,
) {
  type(byLabel(fixture, 'Search'), query);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush([shopProject]);
  backend.expectOne('/api/routes/list').flush([shopRoute]);
  backend.expectOne('/api/certificates/list').flush([wildcard]);
  backend.match('/api/users/list').forEach((request) => request.flush([rui]));
  await settle(fixture);
}

function results(fixture: ComponentFixture<SearchBox>): string[][] {
  const options = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="option"]')];
  return options.map((option) => [
    option.querySelector('span')?.firstChild?.textContent ?? '',
    option.querySelector('small')?.textContent ?? '',
  ]);
}

function press(fixture: ComponentFixture<SearchBox>, key: string) {
  byLabel(fixture, 'Search').dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
}

describe('SearchBox', () => {
  it('loads nothing until someone searches', async () => {
    const { backend } = await render();

    backend.expectNone(() => true);
  });

  it('finds a page by its name', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, 'audit');

    expect(results(fixture)).toEqual([['Audit log', 'Page']]);
  });

  it('finds a route by its hostname and path, with its project', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, 'shop.example.com/cart');

    expect(results(fixture)).toEqual([['shop.example.com/cart', 'Route · Shop']]);
  });

  it('finds a project, with how many routes it has', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, 'project · 2');

    expect(results(fixture)).toEqual([['Shop', 'Project · 2 routes']]);
  });

  it('finds each hostname a certificate covers', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, '*.example');

    expect(results(fixture)).toEqual([['*.example.com', 'Certificate']]);
  });

  it('ignores case and surrounding spaces', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, '  RUI COSTA ');

    expect(results(fixture)).toEqual([['Rui Costa', 'User · rui@example.com']]);
  });

  it('shows at most 8 results', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, 'e');

    expect(results(fixture)).toHaveLength(8);
  });

  it('hides administrator pages from an operator', async () => {
    const { fixture, backend } = await render('operator');

    await search(fixture, backend, 'root key');

    expect(results(fixture)).toEqual([]);
  });

  it('doesn’t look up users for an operator', async () => {
    const { fixture, backend } = await render('operator');

    await search(fixture, backend, 'rui');

    expect(results(fixture)).toEqual([]);
  });

  it('says when nothing matches', async () => {
    const { fixture, backend } = await render();

    await search(fixture, backend, 'zebra');

    expect(textOf(fixture)).toContain('Nothing matches “zebra”.');
  });

  it('opens the chosen result with Enter', async () => {
    const { fixture, backend } = await render();
    await search(fixture, backend, 'shop.example.com');

    press(fixture, 'Enter');

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/routes/route-1'));
  });

  it('moves to the next result with the down arrow', async () => {
    const { fixture, backend } = await render();
    await search(fixture, backend, 'shop');

    press(fixture, 'ArrowDown');
    await settle(fixture);

    expect(byLabel(fixture, 'Search').getAttribute('aria-activedescendant')).toBe('search-1');
  });
});
