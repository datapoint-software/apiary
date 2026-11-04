import { DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RedirectDialog } from './redirect-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<RedirectDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DialogRef, useValue: ref },
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
      'Enter a full address that starts with https://, such as https://example.com.',
    ]);
  });

  it.each(['example.com', 'ftp://example.com'])('refuses %s as the address', async (to) => {
    const dialog = await render();

    await add(dialog, 'www.example.com', to);

    expect(errorOf(dialog.fixture, 'To')).toBe(
      'Enter a full address that starts with https://, such as https://example.com.',
    );
  });

  it('refuses a redirect back to the same hostname', async () => {
    const dialog = await render();

    await add(dialog, 'WWW.example.com', 'https://www.example.com/home');

    expect(errorOf(dialog.fixture, 'To')).toBe(
      'That would send visitors back to the same hostname, in a loop.',
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
      'This hostname is already a route. A hostname can be a route or a redirect, not both.',
    );
  });

  it('closes without adding when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
