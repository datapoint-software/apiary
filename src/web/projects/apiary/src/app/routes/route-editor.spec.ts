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
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
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
});
