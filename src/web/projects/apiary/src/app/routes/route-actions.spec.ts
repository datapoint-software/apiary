import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { nextRequest } from '../testing/backend';
import { aProblem, aRoute } from '../testing/builders';
import { RouteActions } from './route-actions';

const shop = aRoute({ id: 'route-1', host: 'shop.example.com', caching: true });
const blog = aRoute({ id: 'route-2', host: 'blog.example.com', path: '/news', caching: true });
const api = aRoute({ id: 'route-3', host: 'api.example.com', caching: false });

function setUp() {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  return {
    actions: TestBed.inject(RouteActions),
    backend: TestBed.inject(HttpTestingController),
    toaster: TestBed.inject(Toaster),
    confirmer,
  };
}

describe('RouteActions', () => {
  it('disables a route after confirming', async () => {
    const { actions, backend } = setUp();

    const done = actions.disable(shop);
    const request = await nextRequest(backend, '/api/routes/disable');
    request.flush({});

    await expect(done).resolves.toBe(true);
    expect(request.request.body).toEqual({ id: 'route-1' });
  });

  it('offers to undo disabling a route', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.disable(shop);
    (await nextRequest(backend, '/api/routes/disable')).flush({});
    await done;

    expect(toaster.toasts()).toEqual([
      expect.objectContaining({
        text: 'shop.example.com disabled.',
        action: expect.objectContaining({ label: 'Undo' }),
      }),
    ]);
  });

  it('asks to type the hostname before deleting a route', async () => {
    const { actions, backend, confirmer } = setUp();

    const done = actions.delete(blog);
    (await nextRequest(backend, '/api/routes/delete')).flush({});
    await done;

    expect(confirmer.asked[0]).toMatchObject({
      heading: 'Delete route blog.example.com/news?',
      typeToConfirm: 'blog.example.com',
    });
  });

  it('deletes one selected route like a single route', async () => {
    const { actions, backend, confirmer } = setUp();

    const done = actions.deleteMany([shop]);
    (await nextRequest(backend, '/api/routes/delete')).flush({});
    await done;

    expect(confirmer.asked[0].typeToConfirm).toBe('shop.example.com');
  });

  it('asks to type how many routes are deleted at once', async () => {
    const { actions, backend, confirmer } = setUp();

    const done = actions.deleteMany([shop, blog]);
    (await nextRequest(backend, '/api/routes/delete')).flush({});
    (await nextRequest(backend, '/api/routes/delete')).flush({});
    await done;

    expect(confirmer.asked[0]).toMatchObject({
      heading: 'Delete 2 routes?',
      typeToConfirm: 'delete 2 routes',
    });
  });

  it('deletes each selected route in turn', async () => {
    const { actions, backend } = setUp();

    const done = actions.deleteMany([shop, blog]);
    const first = await nextRequest(backend, '/api/routes/delete');
    first.flush({});
    const second = await nextRequest(backend, '/api/routes/delete');
    second.flush({});
    await done;

    expect([first.request.body, second.request.body]).toEqual([
      { id: 'route-1' },
      { id: 'route-2' },
    ]);
  });

  it('purges only the routes that cache', async () => {
    const { actions, backend } = setUp();

    const done = actions.purge([shop, api, blog]);
    const request = await nextRequest(backend, '/api/routes/purge-cache');
    request.flush({});
    await done;

    expect(request.request.body).toEqual({ ids: ['route-1', 'route-2'] });
  });

  it('names the route whose cache was purged', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.purge([shop]);
    (await nextRequest(backend, '/api/routes/purge-cache')).flush({});
    await done;

    expect(toaster.toasts()[0].text).toBe('Cache of shop.example.com purged on every replica.');
  });

  it('counts the routes whose cache was purged', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.purge([shop, blog]);
    (await nextRequest(backend, '/api/routes/purge-cache')).flush({});
    await done;

    expect(toaster.toasts()[0].text).toBe('Cache of 2 routes purged on every replica.');
  });

  it('explains that a route without caching has nothing to purge', async () => {
    const { actions, backend, toaster } = setUp();

    const purged = await actions.purge([api]);

    expect(purged).toBe(false);
    expect(toaster.toasts()[0]).toMatchObject({
      text: 'Caching is off for this route, so there’s nothing to purge.',
      tone: 'error',
    });
    backend.verify();
  });

  it('explains that none of the selected routes cache', async () => {
    const { actions, toaster } = setUp();

    await actions.purge([api, aRoute({ id: 'route-4', caching: false })]);

    expect(toaster.toasts()[0].text).toBe('None of these routes has caching on.');
  });

  it('shows the API’s error when purging fails', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.purge([shop]);
    (await nextRequest(backend, '/api/routes/purge-cache')).flush(aProblem(404, 'route.notFound'), {
      status: 404,
      statusText: 'Not Found',
    });

    await expect(done).resolves.toBe(false);
    expect(toaster.toasts()[0]).toMatchObject({
      text: 'This route was deleted. Go back to the routes list to see what’s there now.',
      tone: 'error',
    });
  });

  it('enables a route', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.enable(shop);
    (await nextRequest(backend, '/api/routes/enable')).flush({});

    await expect(done).resolves.toBe(true);
    expect(toaster.toasts()[0].text).toBe('shop.example.com enabled. Traffic flows again.');
  });

  it('shows the API’s error when enabling fails', async () => {
    const { actions, backend, toaster } = setUp();

    const done = actions.enable(shop);
    (await nextRequest(backend, '/api/routes/enable')).flush(aProblem(404, 'route.notFound'), {
      status: 404,
      statusText: 'Not Found',
    });

    await expect(done).resolves.toBe(false);
    expect(toaster.toasts()[0].tone).toBe('error');
  });
});
