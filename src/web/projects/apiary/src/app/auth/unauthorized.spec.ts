import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { aProblem, aSignedInUser } from '../testing/builders';
import { Auth } from './auth';
import { unauthorized } from './unauthorized';

const sessionEnded = { status: 401, statusText: 'Unauthorized' };

async function setUp(url = '/routes') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([unauthorized])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'routes', children: [] },
        { path: 'sign-in', children: [] },
      ]),
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const auth = TestBed.inject(Auth);
  auth.user.set(aSignedInUser());
  return {
    auth,
    router,
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('unauthorized', () => {
  it('signs out and asks to sign in again when the session ends', async () => {
    const { auth, router, http, backend } = await setUp('/routes');

    const request = firstValueFrom(http.post('/api/routes/list', {})).catch(() => undefined);
    backend.expectOne('/api/routes/list').flush(aProblem(401, 'auth.required'), sessionEnded);
    await request;
    await vi.waitFor(() => expect(router.url).toBe('/sign-in?next=%2Froutes'));

    expect(auth.user()).toBeNull();
  });

  it('passes the error on', async () => {
    const { http, backend } = await setUp();

    const request = firstValueFrom(http.post('/api/routes/list', {}));
    backend.expectOne('/api/routes/list').flush(aProblem(401, 'auth.required'), sessionEnded);

    await expect(request).rejects.toMatchObject({ status: 401 });
  });

  it.each(['/api/auth/verify', '/api/setup/create', '/api/invites/accept'])(
    'leaves the user signed in when %s refuses',
    async (url) => {
      const { auth, http, backend } = await setUp();

      const request = firstValueFrom(http.post(url, {})).catch(() => undefined);
      backend.expectOne(url).flush(aProblem(401, 'code.invalid'), sessionEnded);
      await request;

      expect(auth.user()).not.toBeNull();
    },
  );

  it('leaves the user signed in after other errors', async () => {
    const { auth, http, backend } = await setUp();

    const request = firstValueFrom(http.post('/api/routes/list', {})).catch(() => undefined);
    backend
      .expectOne('/api/routes/list')
      .flush(aProblem(500, 'internal'), { status: 500, statusText: 'Server Error' });
    await request;

    expect(auth.user()).not.toBeNull();
  });

  it('stays on the page when nobody was signed in', async () => {
    const { auth, router, http, backend } = await setUp('/routes');
    auth.user.set(null);

    const request = firstValueFrom(http.post('/api/routes/list', {})).catch(() => undefined);
    backend.expectOne('/api/routes/list').flush(aProblem(401, 'auth.required'), sessionEnded);
    await request;

    expect(router.url).toBe('/routes');
  });
});
