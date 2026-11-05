import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, textOf, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RedirectDialog, RedirectHost } from './redirect-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<RedirectDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(fixed: RedirectHost | null = null): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DialogRef, useValue: ref },
      { provide: DIALOG_DATA, useValue: fixed },
    ],
  });
  const fixture = TestBed.createComponent(RedirectDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend
    .expectOne('/api/projects/list')
    .flush([
      aProject({ id: 'project-1', name: 'Shop' }),
      aProject({ id: 'project-2', name: 'Blog' }),
    ]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function addPath({ fixture }: Rendered, path: string, to: string): Promise<void> {
  type(byLabel(fixture, 'Path'), path);
  type(byLabel(fixture, 'To'), to);
  await settle(fixture);
  byRole(fixture, 'button', 'Add redirect').click();
  await settle(fixture);
}

async function add({ fixture }: Rendered, from: string, to: string): Promise<void> {
  type(byLabel(fixture, 'From hostname'), from);
  type(byLabel(fixture, 'To'), to);
  await settle(fixture);
  byRole(fixture, 'button', 'Add redirect').click();
  await settle(fixture);
}

function control(fixture: ComponentFixture<RedirectDialog>, selector: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLInputElement;
}

describe('RedirectDialog', () => {
  it('asks for a hostname and an address', async () => {
    const dialog = await render();

    await add(dialog, '', '');

    expect([errorOf(dialog.fixture, 'From hostname'), errorOf(dialog.fixture, 'To')]).toEqual([
      'Enter a hostname, such as shop.example.com.',
      'Enter a full address that starts with https://, such as https://example.com, or a path that starts with one /, such as /new.',
    ]);
  });

  it.each(['example.com', 'ftp://example.com'])('refuses %s as the address', async (to) => {
    const dialog = await render();

    await add(dialog, 'www.example.com', to);

    expect(errorOf(dialog.fixture, 'To')).toBe(
      'Enter a full address that starts with https://, such as https://example.com, or a path that starts with one /, such as /new.',
    );
  });

  it('refuses a redirect back to the same hostname', async () => {
    const dialog = await render();

    await add(dialog, 'WWW.example.com', 'https://www.example.com/home');

    expect(errorOf(dialog.fixture, 'To')).toBe(
      'That would send visitors back to where they came from, in a loop. Choose another address.',
    );
    dialog.backend.expectNone('/api/redirects/create');
  });

  it('adds a permanent redirect that keeps the path by default', async () => {
    const dialog = await render();

    await add(dialog, ' www.example.com ', ' https://example.com ');
    const request = await nextRequest(dialog.backend, '/api/redirects/create');

    expect(request.request.body).toEqual({
      projectId: 'project-1',
      from: 'www.example.com',
      to: 'https://example.com',
      statusCode: 308,
      keepPath: true,
    });
  });

  it('adds a temporary redirect that drops the path to the project chosen', async () => {
    const dialog = await render();
    control(dialog.fixture, 'input[type="radio"][value="307"]').click();
    control(dialog.fixture, 'input[type="checkbox"]').click();
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Project'), 'project-2');
    await settle(dialog.fixture);

    await add(dialog, 'www.example.com', 'https://example.com');
    const request = await nextRequest(dialog.backend, '/api/redirects/create');

    expect(request.request.body).toMatchObject({
      projectId: 'project-2',
      statusCode: 307,
      keepPath: false,
    });
  });

  it('closes with the hostname in lowercase and the address', async () => {
    const dialog = await render();

    await add(dialog, 'WWW.Example.com', 'https://example.com');
    (await nextRequest(dialog.backend, '/api/redirects/create')).flush('redirect-9');

    await vi.waitFor(() =>
      expect(dialog.ref.results).toEqual([{ from: 'www.example.com', to: 'https://example.com' }]),
    );
  });

  it('shows the API’s error on the field it names', async () => {
    const dialog = await render();

    await add(dialog, 'shop.example.com', 'https://example.com');
    (await nextRequest(dialog.backend, '/api/redirects/create')).flush(
      aProblem(400, 'validation.failed', [{ field: 'from', code: 'redirect.routeExists' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'From hostname')).toBe(
      'This hostname is a route. To redirect part of it, enter a path, such as /old.',
    );
  });

  it('adds a redirect of a path on the hostname', async () => {
    const dialog = await render();

    type(byLabel(dialog.fixture, 'Path (optional)'), '/old/');
    await add(dialog, 'www.example.com', 'https://example.com/new');
    const request = await nextRequest(dialog.backend, '/api/redirects/create');

    expect(request.request.body).toMatchObject({
      from: 'www.example.com',
      path: '/old',
      to: 'https://example.com/new',
    });
  });

  it('refuses a path on the same hostname when the whole hostname is redirected', async () => {
    const dialog = await render();

    await add(dialog, 'www.example.com', '/new');

    expect(errorOf(dialog.fixture, 'To')).toBe(
      'A path alone works only when you redirect a path. Enter a full address, such as https://example.com.',
    );
  });

  describe('on a route', () => {
    const route: RedirectHost = { host: 'shop.example.com', projectId: 'project-2' };

    it('names the hostname and leaves it fixed', async () => {
      const dialog = await render(route);

      expect([
        byLabel(dialog.fixture, 'From hostname').value,
        byLabel(dialog.fixture, 'From hostname').readOnly,
      ]).toEqual(['shop.example.com', true]);
    });

    it('asks for a path', async () => {
      const dialog = await render(route);

      await addPath(dialog, '', '/new');

      expect(errorOf(dialog.fixture, 'Path')).toBe(
        'Enter a path that starts with /, such as /api, without ? or #.',
      );
    });

    it('refuses a path where Apiary answers certificate challenges', async () => {
      const dialog = await render(route);

      await addPath(dialog, '/.well-known', '/new');

      expect(errorOf(dialog.fixture, 'Path')).toBe(
        'Apiary answers certificate checks under /.well-known/acme-challenge, so it can’t redirect that path.',
      );
    });

    it('refuses a target under the path it redirects', async () => {
      const dialog = await render(route);

      await addPath(dialog, '/old', '/old/new');

      expect(errorOf(dialog.fixture, 'To')).toBe(
        'That would send visitors back to where they came from, in a loop. Choose another address.',
      );
    });

    it('shows where a request would go', async () => {
      const dialog = await render(route);

      type(byLabel(dialog.fixture, 'Path'), '/old');
      type(byLabel(dialog.fixture, 'To'), '/new');
      await settle(dialog.fixture);

      expect(textOf(dialog.fixture)).toContain('shop.example.com/old/2026?ref=mail');
      expect(textOf(dialog.fixture)).toContain('shop.example.com/new/2026?ref=mail');
    });

    it('adds a redirect to a path on the same hostname in the route’s project', async () => {
      const dialog = await render(route);

      await addPath(dialog, '/old', '/new');
      const request = await nextRequest(dialog.backend, '/api/redirects/create');
      request.flush('redirect-9');

      expect(request.request.body).toEqual({
        projectId: 'project-2',
        from: 'shop.example.com',
        path: '/old',
        to: '/new',
        statusCode: 308,
        keepPath: true,
      });
      await vi.waitFor(() =>
        expect(dialog.ref.results).toEqual([{ from: 'shop.example.com/old', to: '/new' }]),
      );
    });
  });

  it('closes without adding when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
