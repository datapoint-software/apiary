import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { InviteView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import { byLabel, byRole, definitionOf, errorOf, settle, textOf, type } from '../testing/dom';
import { AcceptInvite } from './accept-invite';

const password = 'correct horse battery staple';
const invite: InviteView = {
  name: 'Rui Costa',
  email: 'rui@example.com',
  enrollment: {
    challenge: 'challenge-1',
    secret: 'JBSWY3DPEHPK3PXP',
    uri: 'otpauth://totp/Apiary:rui@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Apiary',
  },
};

interface Rendered {
  readonly fixture: ComponentFixture<AcceptInvite>;
  readonly backend: HttpTestingController;
}

function setUp(): Rendered {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
      provideErrorMessages(appMessages),
    ],
  });
  const fixture = TestBed.createComponent(AcceptInvite);
  fixture.componentRef.setInput('token', 'token-1');
  fixture.detectChanges();
  return { fixture, backend: TestBed.inject(HttpTestingController) };
}

async function render(): Promise<Rendered> {
  const page = setUp();
  (await nextRequest(page.backend, '/api/invites/get')).flush(invite);
  await settle(page.fixture);
  return page;
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function createAccount(page: Rendered): Promise<void> {
  await fillIn(page, 'Password', password);
  await fillIn(page, 'Password again', password);
  await fillIn(page, 'Code from the app', '123456');
  byRole(page.fixture, 'button', 'Create account').click();
  await settle(page.fixture);
}

describe('AcceptInvite', () => {
  it('checks the invite first', async () => {
    const { fixture, backend } = setUp();

    const request = await nextRequest(backend, '/api/invites/get');

    expect([request.request.body, textOf(fixture)]).toEqual([
      { token: 'token-1' },
      expect.stringContaining('Checking the invite…'),
    ]);
  });

  it('greets the person invited and shows their email', async () => {
    const { fixture } = await render();

    expect([textOf(fixture), definitionOf(fixture, 'Email')]).toEqual([
      expect.stringContaining('Set up your account, Rui Costa.'),
      'rui@example.com. You sign in with it.',
    ]);
  });

  it('says when the invite link doesn’t work', async () => {
    const { fixture, backend } = setUp();

    (await nextRequest(backend, '/api/invites/get')).flush(aProblem(404, 'invite.invalid'), {
      status: 404,
      statusText: 'Not Found',
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(textOf(fixture)).toContain('This invite link doesn’t work');
    });
  });

  it('asks for the code from the app', async () => {
    const page = await render();
    await fillIn(page, 'Password', password);
    await fillIn(page, 'Password again', password);

    byRole(page.fixture, 'button', 'Create account').click();
    await settle(page.fixture);

    expect(errorOf(page.fixture, 'Code from the app')).toBe('Fill this in.');
  });

  it('creates the account with the invite’s challenge', async () => {
    const page = await render();

    await createAccount(page);
    const request = await nextRequest(page.backend, '/api/invites/accept');

    expect(request.request.body).toEqual({
      token: 'token-1',
      password,
      challenge: 'challenge-1',
      code: '123456',
    });
  });

  it('shows a wrong code under the code', async () => {
    const page = await render();

    await createAccount(page);
    (await nextRequest(page.backend, '/api/invites/accept')).flush(
      aProblem(400, 'validation.failed', [{ field: 'code', code: 'code.invalid' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(page.fixture);

    expect(errorOf(page.fixture, 'Code from the app')).toBe(
      'That code didn’t work. Check that your phone’s clock is right, then try the newest code.',
    );
  });

  it('shows the recovery codes, then welcomes the person by first name', async () => {
    const page = await render();
    await createAccount(page);
    (await nextRequest(page.backend, '/api/invites/accept')).flush(['AAAA-BBBB']);
    await vi.waitFor(() => expect(byRole(page.fixture, 'button', 'I saved them')).toBeTruthy());

    byRole(page.fixture, 'button', 'I saved them').click();
    (await nextRequest(page.backend, '/api/auth/me')).flush(aSignedInUser({ name: 'Rui Costa' }));

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]?.text).toBe('Welcome to Apiary, Rui.'),
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
