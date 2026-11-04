import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { aProblem, aSignedInUser } from '../testing/builders';
import { Auth } from './auth';
import { signedIn } from './signed-in';

const signedOut = { status: 401, statusText: 'Unauthorized' };

function setUp() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  return { auth: TestBed.inject(Auth), backend: TestBed.inject(HttpTestingController) };
}

function visit(url: string) {
  const state = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => signedIn({} as ActivatedRouteSnapshot, state));
}

function serialized(result: unknown): string {
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('signedIn', () => {
  it('lets a signed-in user through without asking the API', async () => {
    const { auth, backend } = setUp();
    auth.user.set(aSignedInUser());

    const result = await visit('/routes');

    expect(result).toBe(true);
    backend.verify();
  });

  it('lets a user with a session through', async () => {
    const { backend } = setUp();

    const result = visit('/routes');
    backend.expectOne('/api/auth/me').flush(aSignedInUser());

    await expect(result).resolves.toBe(true);
  });

  it('sends a signed-out visitor to sign in, then back to the page they asked for', async () => {
    const { backend } = setUp();

    const result = visit('/routes?project=project-1');
    backend.expectOne('/api/auth/me').flush(aProblem(401, 'auth.required'), signedOut);
    (await vi.waitFor(() => backend.expectOne('/api/setup/status'))).flush({ open: false });

    expect(serialized(await result)).toBe('/sign-in?next=%2Froutes%3Fproject%3Dproject-1');
  });

  it('sends a signed-out visitor of the overview to sign in without a page to return to', async () => {
    const { backend } = setUp();

    const result = visit('/');
    backend.expectOne('/api/auth/me').flush(aProblem(401, 'auth.required'), signedOut);
    (await vi.waitFor(() => backend.expectOne('/api/setup/status'))).flush({ open: false });

    expect(serialized(await result)).toBe('/sign-in');
  });

  it('sends the first visitor of a new cluster to setup', async () => {
    const { backend } = setUp();

    const result = visit('/routes');
    backend.expectOne('/api/auth/me').flush(aProblem(401, 'auth.required'), signedOut);
    (await vi.waitFor(() => backend.expectOne('/api/setup/status'))).flush({ open: true });

    expect(serialized(await result)).toBe('/setup');
  });
});
