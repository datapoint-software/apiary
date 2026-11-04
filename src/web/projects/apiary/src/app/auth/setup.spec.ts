import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { SetupStatus, TwoStepEnrollment } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import {
  alertsOf,
  byLabel,
  byRole,
  errorOf,
  queryByRole,
  settle,
  textOf,
  type,
} from '../testing/dom';
import { Setup } from './setup';

const password = 'correct horse battery staple';
const enrollment: TwoStepEnrollment = {
  challenge: 'challenge-1',
  secret: 'JBSWY3DPEHPK3PXP',
  uri: 'otpauth://totp/Apiary:ana@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Apiary',
};
const refused = { status: 400, statusText: 'Bad Request' };
const unreadable =
  'This file isn’t a backup this cluster can open. Choose a file Apiary exported, from a cluster with the same root key.';

interface Rendered {
  readonly fixture: ComponentFixture<Setup>;
  readonly backend: HttpTestingController;
}

async function render(
  status: SetupStatus = { open: true, closesAt: '2026-11-04T12:15:00Z' },
): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
      provideErrorMessages(appMessages),
    ],
  });
  const fixture = TestBed.createComponent(Setup);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/setup/status').flush(status);
  await settle(fixture);
  return { fixture, backend };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function press({ fixture }: Rendered, name: string): Promise<void> {
  byRole(fixture, 'button', name).click();
  await settle(fixture);
}

async function giveDetails(page: Rendered): Promise<void> {
  await fillIn(page, 'Your name', 'Ana Silva');
  await fillIn(page, 'Email', 'ana@example.com');
  await fillIn(page, 'Password', password);
  await fillIn(page, 'Password again', password);
  await press(page, 'Continue');
}

async function reachEnrollment(page: Rendered): Promise<void> {
  await giveDetails(page);
  (await nextRequest(page.backend, '/api/setup/begin')).flush(enrollment);
  await settle(page.fixture);
}

async function chooseBackup({ fixture }: Rendered, file: File): Promise<void> {
  const input = (fixture.nativeElement as HTMLElement).querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await settle(fixture);
}

describe('Setup', () => {
  it('says until when setup stays open', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain('It works until 12:15 UTC');
  });

  it('says when setup is closed', async () => {
    const { fixture } = await render({ open: false });

    expect([
      textOf(fixture).includes('Setup is closed'),
      queryByRole(fixture, 'button', 'Continue'),
    ]).toEqual([true, undefined]);
  });

  it('asks for a name and an email', async () => {
    const page = await render();

    await press(page, 'Continue');

    expect([errorOf(page.fixture, 'Your name'), errorOf(page.fixture, 'Email')]).toEqual([
      'Fill this in.',
      'Fill this in.',
    ]);
  });

  it('asks for the same password twice', async () => {
    const page = await render();
    await fillIn(page, 'Password', password);
    await fillIn(page, 'Password again', 'another long passphrase');

    await press(page, 'Continue');

    expect(errorOf(page.fixture, 'Password again')).toBe('The passwords don’t match.');
  });

  it('checks the details before setting up two-step sign-in', async () => {
    const page = await render();

    await giveDetails(page);
    const request = await nextRequest(page.backend, '/api/setup/begin');

    expect(request.request.body).toEqual({ name: 'Ana Silva', email: 'ana@example.com', password });
  });

  it('shows the API’s error on the field it names', async () => {
    const page = await render();

    await giveDetails(page);
    (await nextRequest(page.backend, '/api/setup/begin')).flush(
      aProblem(400, 'validation.failed', [{ field: 'email', code: 'auth.signInFailed' }]),
      refused,
    );
    await settle(page.fixture);

    expect(errorOf(page.fixture, 'Email')).toBe(
      'The email or password isn’t right. Check both and try again.',
    );
  });

  it('creates the administrator with the code from the app', async () => {
    const page = await render();
    await reachEnrollment(page);
    await fillIn(page, 'Code from the app', '123456');

    await press(page, 'Create administrator');
    const request = await nextRequest(page.backend, '/api/setup/complete');

    expect(request.request.body).toEqual({
      name: 'Ana Silva',
      email: 'ana@example.com',
      password,
      challenge: 'challenge-1',
      code: '123456',
    });
  });

  it('goes back to the details', async () => {
    const page = await render();
    await reachEnrollment(page);

    await press(page, 'Back');

    expect(byLabel(page.fixture, 'Your name').value).toBe('Ana Silva');
  });

  it('shows a wrong code under the code', async () => {
    const page = await render();
    await reachEnrollment(page);
    await fillIn(page, 'Code from the app', '000000');

    await press(page, 'Create administrator');
    (await nextRequest(page.backend, '/api/setup/complete')).flush(
      aProblem(400, 'validation.failed', [{ field: 'code', code: 'code.invalid' }]),
      refused,
    );
    await settle(page.fixture);

    expect(errorOf(page.fixture, 'Code from the app')).toBe(
      'That code didn’t work. Check that your phone’s clock is right, then try the newest code.',
    );
  });

  it('shows the recovery codes, then signs in and welcomes the administrator', async () => {
    const page = await render();
    await reachEnrollment(page);
    await fillIn(page, 'Code from the app', '123456');
    await press(page, 'Create administrator');
    (await nextRequest(page.backend, '/api/setup/complete')).flush(['AAAA-BBBB', 'CCCC-DDDD']);
    await settle(page.fixture);

    await press(page, 'I saved them');
    (await nextRequest(page.backend, '/api/auth/me')).flush(aSignedInUser());

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]?.heading).toBe('You’re the first administrator'),
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('restores a backup instead and goes to sign in', async () => {
    const page = await render();

    await chooseBackup(page, new File(['backup'], 'apiary.backup'));
    const request = await nextRequest(page.backend, '/api/setup/restore');
    request.flush({ users: 2, routes: 1, certificates: 3 });

    expect(request.request.body).toEqual({ content: 'backup' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/sign-in'));
    expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
      '2 users, 1 route and 3 certificates are back. Sign in as before.',
    );
  });

  it('refuses a backup too large to be one', async () => {
    const page = await render();
    const file = new File(['backup'], 'apiary.backup');
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });

    await chooseBackup(page, file);

    expect(alertsOf(page.fixture)).toBe(unreadable);
    page.backend.expectNone('/api/setup/restore');
  });

  it('says why a backup couldn’t be restored', async () => {
    const page = await render();

    await chooseBackup(page, new File(['backup'], 'apiary.backup'));
    (await nextRequest(page.backend, '/api/setup/restore')).flush(
      aProblem(400, 'validation.failed', [{ field: 'content', code: 'backup.unreadable' }]),
      refused,
    );

    await vi.waitFor(() => expect(alertsOf(page.fixture)).toBe(unreadable));
  });

  it('does nothing when no backup is chosen', async () => {
    const page = await render();

    await chooseBackup(page, undefined as unknown as File);

    page.backend.expectNone('/api/setup/restore');
  });
});
