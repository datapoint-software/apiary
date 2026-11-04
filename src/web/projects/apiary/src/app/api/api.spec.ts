import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { aProblem } from '../testing/builders';
import { Api } from './api';

function setUp() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(Api), backend: TestBed.inject(HttpTestingController) };
}

describe('Api', () => {
  it('posts an action to its path, with dots as slashes', async () => {
    const { api, backend } = setUp();

    const sent = api.send('routes.purge-cache', { ids: ['route-1'] });
    const request = backend.expectOne('/api/routes/purge-cache');
    request.flush({});
    await sent;

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ids: ['route-1'] });
  });

  it('posts an empty body when an action has none', async () => {
    const { api, backend } = setUp();

    const read = api.read('auth.me');
    const request = backend.expectOne('/api/auth/me');
    request.flush({});
    await read;

    expect(request.request.body).toEqual({});
  });

  it('resolves with the response', async () => {
    const { api, backend } = setUp();

    const read = api.read<{ open: boolean }>('setup.status');
    backend.expectOne('/api/setup/status').flush({ open: true });

    await expect(read).resolves.toEqual({ open: true });
  });

  it('counts a change after a successful send, so queries load again', async () => {
    const { api, backend } = setUp();

    const sent = api.send('routes.enable', { id: 'route-1' });
    backend.expectOne('/api/routes/enable').flush({});
    await sent;

    expect(api.version()).toBe(1);
  });

  it('counts no change after a read', async () => {
    const { api, backend } = setUp();

    const read = api.read('routes.list');
    backend.expectOne('/api/routes/list').flush([]);
    await read;

    expect(api.version()).toBe(0);
  });

  it('counts no change after a failed send', async () => {
    const { api, backend } = setUp();

    const sent = api.send('routes.enable', { id: 'route-1' });
    backend
      .expectOne('/api/routes/enable')
      .flush(aProblem(404, 'route.notFound'), { status: 404, statusText: 'Not Found' });
    await sent.catch(() => undefined);

    expect(api.version()).toBe(0);
  });

  it('rejects with the API’s problem', async () => {
    const { api, backend } = setUp();
    const problem = aProblem(409, 'route.duplicate', [{ field: 'host', code: 'route.duplicate' }]);

    const sent = api.send('routes.create', {});
    backend.expectOne('/api/routes/create').flush(problem, { status: 409, statusText: 'Conflict' });

    await expect(sent).rejects.toEqual(problem);
  });

  it('rejects with an internal problem when the response isn’t a problem', async () => {
    const { api, backend } = setUp();

    const read = api.read('routes.list');
    backend
      .expectOne('/api/routes/list')
      .flush('Bad gateway', { status: 502, statusText: 'Bad Gateway' });

    await expect(read).rejects.toEqual({ status: 502, code: 'internal' });
  });

  it('rejects with an offline problem when the server can’t be reached', async () => {
    const { api, backend } = setUp();

    const read = api.read('routes.list');
    backend.expectOne('/api/routes/list').error(new ProgressEvent('error'));

    await expect(read).rejects.toEqual({ status: 0, code: 'network.offline' });
  });

  it('describes a query as a POST to the action’s path', () => {
    const { api } = setUp();

    expect(api.query('routes.get', { id: 'route-1' })).toEqual({
      url: '/api/routes/get',
      method: 'POST',
      body: { id: 'route-1' },
    });
  });
});
