import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { SignInStep } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import { alertsOf, byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { SignIn } from './sign-in';

const codeStep: SignInStep = { next: 'code', challenge: 'challenge-1' };
const refused = { status: 400, statusText: 'Bad Request' };

async function render(next = '') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: '', children: [] },
        { path: 'routes', children: [] },
      ]),
      provideErrorMessages(appMessages),
    ],
  });
  const fixture = TestBed.createComponent(SignIn);
  fixture.componentRef.setInput('next', next);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/auth/options').flush({});
  await settle(fixture);
  return { fixture, backend };
}

async function submitCredentials(
  fixture: ComponentFixture<SignIn>,
  email = 'ana@example.com',
  password = 'a long passphrase',
) {
  type(byLabel(fixture, 'Email'), email);
  type(byLabel(fixture, 'Password'), password);
  byRole(fixture, 'button', 'Sign in').click();
  await settle(fixture);
}

async function reachCodeStep(fixture: ComponentFixture<SignIn>, backend: HttpTestingController) {
  await submitCredentials(fixture);
  (await nextRequest(backend, '/api/auth/sign-in')).flush(codeStep);
  await settle(fixture);
}

async function submitCode(fixture: ComponentFixture<SignIn>, code: string) {
  type(byLabel(fixture, 'Code'), code);
  byRole(fixture, 'button', 'Continue').click();
  await settle(fixture);
}

describe('SignIn', () => {
  it('sends the email and password', async () => {
    const { fixture, backend } = await render();

    await submitCredentials(fixture, 'ana@example.com', 'a long passphrase');
    const request = await nextRequest(backend, '/api/auth/sign-in');

    expect(request.request.body).toEqual({
      email: 'ana@example.com',
      password: 'a long passphrase',
    });
  });

  it('asks for the email and password before sending them', async () => {
    const { fixture, backend } = await render();

    byRole(fixture, 'button', 'Sign in').click();
    await settle(fixture);

    expect([errorOf(fixture, 'Email'), errorOf(fixture, 'Password')]).toEqual([
      'Fill this in.',
      'Fill this in.',
    ]);
    backend.expectNone('/api/auth/sign-in');
  });

  it('shows the API’s error on the field it names', async () => {
    const { fixture, backend } = await render();

    await submitCredentials(fixture, 'ana');
    (await nextRequest(backend, '/api/auth/sign-in')).flush(
      aProblem(400, 'validation.failed', [{ field: 'email', code: 'email.invalid' }]),
      refused,
    );
    await settle(fixture);

    expect(errorOf(fixture, 'Email')).toBe('Enter an email address, such as ana@example.com.');
  });

  it('shows an error that names no field above the form', async () => {
    const { fixture, backend } = await render();

    await submitCredentials(fixture);
    (await nextRequest(backend, '/api/auth/sign-in')).flush(aProblem(401, 'auth.signInFailed'), {
      status: 401,
      statusText: 'Unauthorized',
    });
    await settle(fixture);

    expect(alertsOf(fixture)).toContain(
      'The email or password isn’t right. Check both and try again.',
    );
  });

  it('asks for the code from the authenticator app next', async () => {
    const { fixture, backend } = await render();

    await reachCodeStep(fixture, backend);

    expect(textOf(fixture)).toContain('Enter the code from your authenticator app.');
  });

  it('sends the code with the sign-in challenge', async () => {
    const { fixture, backend } = await render();
    await reachCodeStep(fixture, backend);

    await submitCode(fixture, '123 456');
    const request = await nextRequest(backend, '/api/auth/verify');

    expect(request.request.body).toEqual({ challenge: 'challenge-1', code: '123 456' });
  });

  it('asks for six digits before sending a code', async () => {
    const { fixture, backend } = await render();
    await reachCodeStep(fixture, backend);

    await submitCode(fixture, '1234');

    expect(errorOf(fixture, 'Code')).toBe('Enter the 6 digits the app shows.');
    backend.expectNone('/api/auth/verify');
  });

  it('shows a refused code on the code field', async () => {
    const { fixture, backend } = await render();
    await reachCodeStep(fixture, backend);

    await submitCode(fixture, '123456');
    (await nextRequest(backend, '/api/auth/verify')).flush(
      aProblem(400, 'validation.failed', [{ field: 'code', code: 'code.invalid' }]),
      refused,
    );
    await settle(fixture);

    expect(errorOf(fixture, 'Code')).toBe(
      'That code didn’t work. Check that your phone’s clock is right, then try the newest code.',
    );
  });

  it('opens the page the user asked for once the code is right', async () => {
    const { fixture, backend } = await render('/routes');
    await reachCodeStep(fixture, backend);

    await submitCode(fixture, '123456');
    (await nextRequest(backend, '/api/auth/verify')).flush({});
    (await nextRequest(backend, '/api/auth/me')).flush(aSignedInUser());

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/routes'));
  });

  it('opens the overview instead of a page on another site', async () => {
    const { fixture, backend } = await render('https://attacker.example.com');
    await reachCodeStep(fixture, backend);

    await submitCode(fixture, '123456');
    (await nextRequest(backend, '/api/auth/verify')).flush({});
    (await nextRequest(backend, '/api/auth/me')).flush(aSignedInUser());

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
  });

  it('accepts a recovery code instead', async () => {
    const { fixture, backend } = await render();
    await reachCodeStep(fixture, backend);

    byRole(fixture, 'button', 'Use a recovery code').click();
    await settle(fixture);

    expect(byLabel(fixture, 'Recovery code').placeholder).toBe('xxxx-xxxx-xxxx-xxxx');
  });
});
