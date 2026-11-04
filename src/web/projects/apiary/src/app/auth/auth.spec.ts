import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { currentLanguage } from '@datapoint/apiary-ui';
import { aProblem, aSignedInUser } from '../testing/builders';
import { Auth } from './auth';

function setUp() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { auth: TestBed.inject(Auth), backend: TestBed.inject(HttpTestingController) };
}

afterEach(() => currentLanguage.set('en'));

describe('Auth', () => {
  it('loads the signed-in user', async () => {
    const { auth, backend } = setUp();
    const user = aSignedInUser({ name: 'Ana Silva' });

    const loaded = auth.load();
    backend.expectOne('/api/auth/me').flush(user);

    await expect(loaded).resolves.toEqual(user);
    expect(auth.user()).toEqual(user);
  });

  it('switches to the language saved in the user’s profile', async () => {
    const { auth, backend } = setUp();

    const loaded = auth.load();
    backend.expectOne('/api/auth/me').flush(aSignedInUser({ language: 'pt-PT' }));
    await loaded;

    expect(currentLanguage()).toBe('pt-PT');
  });

  it('has no user when the session ended', async () => {
    const { auth, backend } = setUp();
    auth.user.set(aSignedInUser());

    const loaded = auth.load();
    backend
      .expectOne('/api/auth/me')
      .flush(aProblem(401, 'auth.required'), { status: 401, statusText: 'Unauthorized' });

    await expect(loaded).resolves.toBeNull();
    expect(auth.user()).toBeNull();
  });

  it('passes on any other problem', async () => {
    const { auth, backend } = setUp();

    const loaded = auth.load();
    backend
      .expectOne('/api/auth/me')
      .flush(aProblem(500, 'internal'), { status: 500, statusText: 'Server Error' });

    await expect(loaded).rejects.toMatchObject({ code: 'internal' });
  });

  it.each([
    ['viewer', false, false],
    ['operator', true, false],
    ['administrator', true, true],
  ] as const)('lets a %s operate: %s, and administer: %s', (role, canOperate, canAdminister) => {
    const { auth } = setUp();

    auth.user.set(aSignedInUser({ role }));

    expect([auth.canOperate(), auth.canAdminister()]).toEqual([canOperate, canAdminister]);
  });

  it('forgets the user after signing out, even when the request fails', async () => {
    const { auth, backend } = setUp();
    auth.user.set(aSignedInUser());

    const signedOut = auth.signOut();
    backend
      .expectOne('/api/auth/sign-out')
      .flush(aProblem(500, 'internal'), { status: 500, statusText: 'Server Error' });
    await signedOut.catch(() => undefined);

    expect(auth.user()).toBeNull();
  });
});
