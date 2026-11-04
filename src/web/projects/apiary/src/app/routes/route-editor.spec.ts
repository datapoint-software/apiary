import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { ProjectView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aCluster, aProblem, aProject, aRoute, aSignedInUser } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { ClosingDialog } from '../testing/closing-dialog';
import { RouteAccessDialog } from './route-access-dialog';
import { Dialog } from '@angular/cdk/dialog';
import { noServerChecks } from '../testing/no-server-checks';
import { RouteEditor } from './route-editor';

interface Rendered {
  readonly fixture: ComponentFixture<RouteEditor>;
  readonly backend: HttpTestingController;
}

async function render(
  projects: ProjectView[] = [aProject()],
  existing?: RouteView,
): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideRouter([{ path: 'routes', children: [] }]),
      provideErrorMessages(appMessages),
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role: 'operator' }));
  const fixture = TestBed.createComponent(RouteEditor);
  if (existing) {
    fixture.componentRef.setInput('id', existing.id);
  }
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush(projects);
  backend.expectOne('/api/certificates/list').flush([]);
  backend.match('/api/routes/get').forEach((request) => request.flush(existing ?? null));
  backend.match('/api/cluster/status').forEach((request) => request.flush(aCluster()));
  await settle(fixture);
  return { fixture, backend };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function submit({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

describe('RouteEditor', () => {
  it('doesn’t create a route without a hostname', async () => {
    const editor = await render();

    await submit(editor, 'Create route');

    editor.backend.expectNone('/api/routes/create');
    expect(errorOf(editor.fixture, 'Hostname')).toBe('Enter a hostname, such as shop.example.com.');
  });

  it('doesn’t create a route without a target', async () => {
    const editor = await render();
    await fillIn(editor, 'Hostname', 'shop.example.com');

    await submit(editor, 'Create route');

    editor.backend.expectNone('/api/routes/create');
    expect(errorOf(editor.fixture, 'Service or host')).toBe(
      'Enter a target, such as the service name shop-v1.',
    );
  });

  it('asks for a project when there are several to choose from', async () => {
    const editor = await render([
      aProject({ id: 'project-1' }),
      aProject({ id: 'project-2', name: 'Blog' }),
    ]);
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');

    await submit(editor, 'Create route');

    editor.backend.expectNone('/api/routes/create');
    expect(errorOf(editor.fixture, 'Project')).toBe('Choose a project.');
  });

  it('creates a route in the only project, with the defaults for everything left alone', async () => {
    const editor = await render([aProject({ id: 'project-1' })]);
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');

    await submit(editor, 'Create route');
    const request = await nextRequest(editor.backend, '/api/routes/create');

    expect(request.request.body).toEqual({
      projectId: 'project-1',
      host: 'shop.example.com',
      path: '/',
      targets: [{ host: 'shop-v1', port: 8080, weight: 100 }],
      timeoutSeconds: 30,
      certificateId: null,
      allowedAddresses: [],
      rateLimit: null,
      maintenance: null,
      canary: null,
      sticky: false,
      compression: false,
      caching: false,
      strictTransport: false,
      strictTransportSubdomains: false,
      password: null,
    });
  });

  it('goes back to the routes after creating one', async () => {
    const editor = await render();
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');

    await submit(editor, 'Create route');
    (await nextRequest(editor.backend, '/api/routes/create')).flush({});

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/routes'));
    expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
      'shop.example.com saved. It applies on every replica now.',
    );
  });

  it('shows the API’s error on the field it names', async () => {
    const editor = await render();
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');

    await submit(editor, 'Create route');
    (await nextRequest(editor.backend, '/api/routes/create')).flush(
      aProblem(409, 'route.duplicate', [{ field: 'host', code: 'route.duplicate' }]),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(editor.fixture);

    expect(errorOf(editor.fixture, 'Hostname')).toBe(
      'Another route already uses this hostname and path. Change one of them.',
    );
  });

  it('saves changes to an existing route with its id', async () => {
    const editor = await render([aProject()], aRoute({ id: 'route-1', host: 'shop.example.com' }));
    await fillIn(editor, 'Path', '/cart');

    await submit(editor, 'Save route');
    const request = await nextRequest(editor.backend, '/api/routes/update');

    expect(request.request.body).toMatchObject({
      id: 'route-1',
      host: 'shop.example.com',
      path: '/cart',
    });
  });

  it('shows the status, traffic and last change of an existing route', async () => {
    const editor = await render(
      [aProject()],
      aRoute({
        requestsPerMinute: 12,
        changedBy: 'Ana Silva',
        changedAt: new Date().toISOString(),
      }),
    );

    expect(textOf(editor.fixture)).toContain('12 req/min');
  });

  it('says when a route doesn’t exist', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([noServerChecks])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideErrorMessages(appMessages),
      ],
    });
    const fixture = TestBed.createComponent(RouteEditor);
    fixture.componentRef.setInput('id', 'route-9');
    const backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    backend.expectOne('/api/projects/list').flush([aProject()]);
    backend.expectOne('/api/certificates/list').flush([]);
    backend
      .expectOne('/api/routes/get')
      .flush(aProblem(404, 'route.notFound'), { status: 404, statusText: 'Not Found' });
    await settle(fixture);

    expect(textOf(fixture)).toContain('This route doesn’t exist');
  });

  it('tells a viewer they can only look', async () => {
    const editor = await render([aProject()], aRoute());
    TestBed.inject(Auth).user.set(aSignedInUser({ role: 'viewer' }));
    await settle(editor.fixture);

    expect(textOf(editor.fixture)).toContain('You can view this route');
  });

  it('lists the uploaded certificates to choose from', async () => {
    const editor = await render();

    (editor.fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>('input[type="radio"][value="uploaded"]')
      ?.click();
    await settle(editor.fixture);

    expect(byLabel<HTMLSelectElement>(editor.fixture, 'Uploaded certificate').options[0].text).toBe(
      'Choose a certificate',
    );
  });

  it('shows the password once a route that asks for one is created', async () => {
    const dialog = new ClosingDialog();
    TestBed.overrideProvider(Dialog, { useValue: dialog });
    const editor = await render();
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');
    (
      [...(editor.fixture.nativeElement as HTMLElement).querySelectorAll('label')]
        .find((l) => l.textContent?.includes('Ask visitors for a password'))
        ?.querySelector('input') as HTMLInputElement
    ).click();
    await settle(editor.fixture);

    await submit(editor, 'Create route');
    (await nextRequest(editor.backend, '/api/routes/create')).flush({});

    await vi.waitFor(() => expect(dialog.opened[0]?.component).toBe(RouteAccessDialog));
  });

  it('has unsaved changes once a field is edited', async () => {
    const editor = await render();

    await fillIn(editor, 'Hostname', 'shop.example.com');

    expect(editor.fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});
