import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { SignedInUser } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import {
  byLabel,
  byRole,
  definitionOf,
  errorOf,
  queryByRole,
  settle,
  textOf,
  type,
} from '../testing/dom';
import { Profile } from './profile';

interface Rendered {
  readonly fixture: ComponentFixture<Profile>;
  readonly backend: HttpTestingController;
}

async function render(user: SignedInUser = aSignedInUser()): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
    ],
  });
  TestBed.inject(Auth).user.set(user);
  const fixture = TestBed.createComponent(Profile);
  const backend = TestBed.inject(HttpTestingController);
  await settle(fixture);
  return { fixture, backend };
}

async function save({ fixture }: Rendered, name: string, email: string): Promise<void> {
  type(byLabel(fixture, 'Name'), name);
  type(byLabel(fixture, 'Email'), email);
  await settle(fixture);
  byRole(fixture, 'button', 'Save profile').click();
  await settle(fixture);
}

describe('Profile', () => {
  it('shows the signed-in user’s name and email', async () => {
    const { fixture } = await render(
      aSignedInUser({ name: 'Ana Silva', email: 'ana@example.com' }),
    );

    expect([byLabel(fixture, 'Name').value, byLabel(fixture, 'Email').value]).toEqual([
      'Ana Silva',
      'ana@example.com',
    ]);
  });

  it('says another administrator can change the role', async () => {
    const { fixture } = await render(aSignedInUser({ role: 'operator' }));

    expect(definitionOf(fixture, 'Role')).toBe('Operator. Another administrator can change it.');
  });

  it('sends the new name and email', async () => {
    const profile = await render();

    await save(profile, 'Ana Sousa', 'ana.sousa@example.com');
    const request = await nextRequest(profile.backend, '/api/account/update-profile');

    expect(request.request.body).toEqual({ name: 'Ana Sousa', email: 'ana.sousa@example.com' });
  });

  it('asks for a name and an email', async () => {
    const profile = await render();

    await save(profile, '', '');

    expect([errorOf(profile.fixture, 'Name'), errorOf(profile.fixture, 'Email')]).toEqual([
      'Fill this in.',
      'Fill this in.',
    ]);
    profile.backend.expectNone('/api/account/update-profile');
  });

  it('shows the saved profile', async () => {
    const profile = await render();

    await save(profile, 'Ana Sousa', 'ana.sousa@example.com');
    (await nextRequest(profile.backend, '/api/account/update-profile')).flush(null);
    (await nextRequest(profile.backend, '/api/auth/me')).flush(
      aSignedInUser({ name: 'Ana Sousa', email: 'ana.sousa@example.com' }),
    );

    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Profile saved.'));
    expect(TestBed.inject(Auth).user()?.name).toBe('Ana Sousa');
  });

  it('shows the API’s error on the field it names', async () => {
    const profile = await render();

    await save(profile, 'Ana Silva', 'rui@example.com');
    (await nextRequest(profile.backend, '/api/account/update-profile')).flush(
      aProblem(400, 'validation.failed', [{ field: 'email', code: 'email.taken' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(profile.fixture);

    expect(errorOf(profile.fixture, 'Email')).toBe('Someone already uses this email.');
  });

  it('says the identity provider manages a single sign-on account', async () => {
    const { fixture } = await render(aSignedInUser({ singleSignOn: true }));

    expect(textOf(fixture)).toContain('Your identity provider manages your account');
  });

  it('doesn’t let a single sign-on user edit the profile', async () => {
    const { fixture } = await render(aSignedInUser({ singleSignOn: true }));

    expect([
      byLabel(fixture, 'Name').disabled,
      queryByRole(fixture, 'button', 'Save profile'),
    ]).toEqual([true, undefined]);
  });

  it('says the role of a single sign-on user comes from their groups', async () => {
    const { fixture } = await render(aSignedInUser({ singleSignOn: true, role: 'viewer' }));

    expect(definitionOf(fixture, 'Role')).toBe(
      'Viewer. It comes from your groups at the identity provider.',
    );
  });

  it('links to the other account pages', async () => {
    const { fixture } = await render();

    expect(byRole(fixture, 'link', 'Active sessions').getAttribute('href')).toBe(
      '/account/sessions',
    );
  });
});
