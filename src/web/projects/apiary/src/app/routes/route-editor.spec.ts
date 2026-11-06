import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { CertificateSummary, DnsProviderView, ProjectView, RouteView, TrustedProxyView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aCertificate, aCluster, aDnsProvider, aProblem, aProject, aRoute, aSignedInUser, aTrustedProxy } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, textOf, type } from '../testing/dom';
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
  trustedProxies: TrustedProxyView[] = [],
  certificates: CertificateSummary[] = [],
  providers: DnsProviderView[] = [],
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
  backend.expectOne('/api/certificates/list').flush(certificates);
  backend.expectOne('/api/dns-providers/list').flush(providers);
  backend.expectOne('/api/routes/defaults').flush({ requestMegabytes: 30 });
  backend.match('/api/routes/get').forEach((request) => request.flush(existing ?? null));
  backend.match('/api/cluster/status').forEach((request) => request.flush(aCluster()));
  backend.match('/api/trusted-proxies/list').forEach((request) => request.flush(trustedProxies));
  if (existing) {
    (await nextRequest(backend, '/api/redirects/list')).flush([]);
  }
  await settle(fixture);
  return { fixture, backend };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function chooseSource({ fixture }: Rendered, source: string): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type="radio"][value="${source}"]`)?.click();
  await settle(fixture);
}

async function submit({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

describe('RouteEditor', () => {
  it('links the allowed addresses to the trusted proxies when there are some', async () => {
    const { fixture } = await render([aProject()], undefined, [aTrustedProxy()]);

    expect(byRole(fixture, 'link', 'trusted proxy').getAttribute('href')).toBe('/trusted-proxies');
  });

  it('doesn’t mention trusted proxies when there are none', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).not.toContain('X-Forwarded-For');
  });

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
      requestSize: 'default',
      requestMegabytes: null,
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
    backend.expectOne('/api/dns-providers/list').flush([]);
    backend.expectOne('/api/routes/defaults').flush({ requestMegabytes: 30 });
    backend
      .expectOne('/api/routes/get')
      .flush(aProblem(404, 'route.notFound'), { status: 404, statusText: 'Not Found' });
    backend.expectOne('/api/trusted-proxies/list').flush([]);
    await settle(fixture);

    expect(textOf(fixture)).toContain('This route doesn’t exist');
  });

  it('tells a viewer they can only look', async () => {
    const editor = await render([aProject()], aRoute());
    TestBed.inject(Auth).user.set(aSignedInUser({ role: 'viewer' }));
    await settle(editor.fixture);

    expect(textOf(editor.fixture)).toContain('You can view this route');
  });

  it('lists the uploaded certificates and the requested wildcards that cover the hostname', async () => {
    const editor = await render([aProject()], undefined, [], [
      aCertificate({ id: 'wildcard', name: '*.example.com', hosts: ['*.example.com', 'example.com'], requested: true }),
      aCertificate({ id: 'uploaded', source: 'uploaded', name: 'intranet.corp', hosts: ['intranet.corp'], notAfter: '2027-01-31T00:00:00Z' }),
      aCertificate({ id: 'other', name: '*.example.net', hosts: ['*.example.net'], requested: true }),
    ]);
    await fillIn(editor, 'Hostname', 'shop.example.com');

    await chooseSource(editor, 'uploaded');

    expect([...byLabel<HTMLSelectElement>(editor.fixture, 'Certificate').options].map((o) => o.text)).toEqual([
      'Choose a certificate',
      '*.example.com, example.com (renewed automatically)',
      'intranet.corp (expires 2027-01-31)',
    ]);
  });

  it('offers the DNS providers to check an automatic certificate with', async () => {
    const editor = await render([aProject()], undefined, [], [], [aDnsProvider({ name: 'Office DNS' })]);

    expect([...byLabel<HTMLSelectElement>(editor.fixture, 'Checked with').options].map((o) => o.text)).toEqual([
      'A file on port 80 (HTTP-01)',
      'A DNS record through Office DNS',
    ]);
  });

  it('suggests the DNS provider that proves the hostname', async () => {
    const editor = await render([aProject()], undefined, [], [], [aDnsProvider({ name: 'Office DNS', domains: ['corp.example.com'] })]);

    await fillIn(editor, 'Hostname', 'intranet.corp.example.com');

    expect(textOf(editor.fixture)).toContain('Office DNS proves intranet.corp.example.com: choose it if Let’s Encrypt can’t reach this hostname on port 80.');
  });

  it('says which CNAME a delegated provider needs', async () => {
    const editor = await render([aProject()], undefined, [], [], [aDnsProvider({ id: 'provider-1', challengeZone: 'acme.example.net' })]);
    await fillIn(editor, 'Hostname', 'shop.example.com');

    choose(byLabel<HTMLSelectElement>(editor.fixture, 'Checked with'), 'provider-1');
    await settle(editor.fixture);

    expect(textOf(editor.fixture)).toContain('Needs the CNAME _acme-challenge.shop.example.com → shop.example.com.acme.example.net.');
  });

  it('refuses a DNS provider that doesn’t prove the hostname', async () => {
    const editor = await render([aProject()], undefined, [], [], [aDnsProvider({ id: 'provider-1', domains: ['example.net'] })]);
    await fillIn(editor, 'Hostname', 'shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');
    choose(byLabel<HTMLSelectElement>(editor.fixture, 'Checked with'), 'provider-1');

    await submit(editor, 'Create route');

    editor.backend.expectNone('/api/routes/create');
    expect(errorOf(editor.fixture, 'Checked with')).toBe('This DNS provider doesn’t prove the hostname. Choose one that does, or a file on port 80.');
  });

  it('sets how a new route’s certificate is checked before creating the route, so it’s never tried over HTTP-01', async () => {
    const editor = await render([aProject()], undefined, [], [], [aDnsProvider({ id: 'provider-1' })]);
    await fillIn(editor, 'Hostname', 'Shop.example.com');
    await fillIn(editor, 'Service or host', 'shop-v1');
    choose(byLabel<HTMLSelectElement>(editor.fixture, 'Checked with'), 'provider-1');

    await submit(editor, 'Create route');
    const request = await nextRequest(editor.backend, '/api/certificates/set-challenge');

    expect(request.request.body).toEqual({ name: 'shop.example.com', dnsProviderId: 'provider-1' });
    editor.backend.expectNone('/api/routes/create');
  });

  it('starts from how the route’s own certificate is checked, and leaves it alone when unchanged', async () => {
    const route = aRoute({ id: 'route-1', host: 'shop.example.com' });
    const editor = await render([aProject()], route, [], [aCertificate({ name: 'shop.example.com', dnsProviderId: 'provider-1' })], [aDnsProvider({ id: 'provider-1' })]);

    expect(byLabel<HTMLSelectElement>(editor.fixture, 'Checked with').value).toBe('provider-1');
    await submit(editor, 'Save route');
    (await nextRequest(editor.backend, '/api/routes/update')).flush({});

    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()[0]?.text).toBe('shop.example.com saved. It applies on every replica now.'));
    editor.backend.expectNone('/api/certificates/set-challenge');
  });

  it('goes back to a file on port 80 when the DNS provider is no longer chosen', async () => {
    const route = aRoute({ id: 'route-1', host: 'shop.example.com' });
    const editor = await render([aProject()], route, [], [aCertificate({ name: 'shop.example.com', dnsProviderId: 'provider-1' })], [aDnsProvider({ id: 'provider-1' })]);
    choose(byLabel<HTMLSelectElement>(editor.fixture, 'Checked with'), 'http-01');

    await submit(editor, 'Save route');
    const request = await nextRequest(editor.backend, '/api/certificates/set-challenge');

    expect(request.request.body).toEqual({ name: 'shop.example.com', dnsProviderId: null });
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

  it('locks what the stack file sets, and still saves the rest', async () => {
    const editor = await render(
      [aProject()],
      aRoute({
        id: 'route-1',
        host: 'shop.example.com',
        stack: { stack: 'shop', service: 'web', name: 'site', fields: ['host', 'path', 'targets'] },
      }),
    );

    expect(textOf(editor.fixture)).toContain('Declared in stack shop');
    expect([
      byLabel(editor.fixture, 'Hostname').disabled,
      byLabel(editor.fixture, 'Service or host').disabled,
      byLabel(editor.fixture, 'Timeout').disabled,
    ]).toEqual([true, true, false]);
    expect(byRole(editor.fixture, 'link', 'shop').getAttribute('href')).toBe('/stacks/shop');

    await fillIn(editor, 'Timeout', '90');
    await submit(editor, 'Save route');
    const request = await nextRequest(editor.backend, '/api/routes/update');

    expect(request.request.body).toMatchObject({
      id: 'route-1',
      host: 'shop.example.com',
      timeoutSeconds: 90,
    });
  });
});
