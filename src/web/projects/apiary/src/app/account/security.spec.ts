import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { SignedInUser, TwoStepEnrollment } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { NewCodesDialog } from './new-codes-dialog';
import { RecoveryCodesDialog } from './recovery-codes-dialog';
import { Security } from './security';
import { TwoStepDialog } from './two-step-dialog';

const enrollment: TwoStepEnrollment = {
  challenge: 'challenge-1',
  secret: 'JBSWY3DPEHPK3PXP',
  uri: 'otpauth://totp/Apiary:ana@example.com?secret=JBSWY3DPEHPK3PXP',
};
const strongPassword = 'four unrelated words together';

interface Rendered {
  readonly fixture: ComponentFixture<Security>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
}

async function render(
  user: SignedInUser = aSignedInUser({ twoStepSetUpAt: '2026-10-01T10:00:00Z' }),
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(user);
  const fixture = TestBed.createComponent(Security);
  const backend = TestBed.inject(HttpTestingController);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

async function changePassword(
  { fixture }: Rendered,
  current: string,
  next: string,
  again = next,
): Promise<void> {
  type(byLabel(fixture, 'Current password'), current);
  type(byLabel(fixture, 'New password'), next);
  type(byLabel(fixture, 'New password again'), again);
  await settle(fixture);
  byRole(fixture, 'button', 'Change password').click();
  await settle(fixture);
}

describe('Security', () => {
  it('sends the current and the new password', async () => {
    const security = await render();

    await changePassword(security, 'the old passphrase', strongPassword);
    const request = await nextRequest(security.backend, '/api/account/change-password');

    expect(request.request.body).toEqual({ current: 'the old passphrase', next: strongPassword });
  });

  it('asks for the current password', async () => {
    const security = await render();

    await changePassword(security, '', strongPassword);

    expect(errorOf(security.fixture, 'Current password')).toBe('Fill this in.');
  });

  it('asks for at least 15 characters', async () => {
    const security = await render();

    await changePassword(security, 'the old passphrase', 'too short');

    expect(errorOf(security.fixture, 'New password')).toBe('Use at least 15 characters.');
  });

  it('asks for the same new password twice', async () => {
    const security = await render();

    await changePassword(security, 'the old passphrase', strongPassword, 'something else entirely');

    expect(errorOf(security.fixture, 'New password again')).toBe('The passwords don’t match.');
    security.backend.expectNone('/api/account/change-password');
  });

  it('shows a wrong current password on its field', async () => {
    const security = await render();

    await changePassword(security, 'a wrong passphrase', strongPassword);
    (await nextRequest(security.backend, '/api/account/change-password')).flush(
      aProblem(400, 'validation.failed', [{ field: 'current', code: 'password.incorrect' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(security.fixture);

    expect(errorOf(security.fixture, 'Current password')).toBe('That isn’t your current password.');
  });

  it('says which sessions and agents the new password signed out', async () => {
    const security = await render();

    await changePassword(security, 'the old passphrase', strongPassword);
    (await nextRequest(security.backend, '/api/account/change-password')).flush({
      sessions: 2,
      agents: 1,
    });

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Password changed',
        text: 'You stay signed in here. Your 2 other sessions were signed out. Your agent was disconnected; connect them again.',
      }),
    );
  });

  it('clears the form once the password is changed', async () => {
    const security = await render();

    await changePassword(security, 'the old passphrase', strongPassword);
    (await nextRequest(security.backend, '/api/account/change-password')).flush({
      sessions: 0,
      agents: 0,
    });

    await vi.waitFor(() => expect(byLabel(security.fixture, 'Current password').value).toBe(''));
  });

  it('says when two-step sign-in was set up', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain('Set up on 2026-10-01');
  });

  it('counts the recovery codes left', async () => {
    const { fixture } = await render(aSignedInUser({ recoveryCodesLeft: 7 }));

    expect(textOf(fixture)).toContain('7 of 10 left.');
  });

  it('sets up two-step sign-in again with a new secret', async () => {
    const security = await render();

    byRole(security.fixture, 'button', 'Set up again…').click();
    (await nextRequest(security.backend, '/api/account/begin-two-step')).flush(enrollment);

    await vi.waitFor(() =>
      expect(security.dialog.opened[0]).toEqual({ component: TwoStepDialog, data: enrollment }),
    );
  });

  it('confirms two-step sign-in is set up again', async () => {
    const security = await render(aSignedInUser(), new ClosingDialog(true));

    byRole(security.fixture, 'button', 'Set up again…').click();
    (await nextRequest(security.backend, '/api/account/begin-two-step')).flush(enrollment);
    (await nextRequest(security.backend, '/api/auth/me')).flush(aSignedInUser());

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].heading).toBe('Two-step sign-in set up'),
    );
  });

  it('asks before making new recovery codes', async () => {
    const security = await render(aSignedInUser({ recoveryCodesLeft: 3 }));

    byRole(security.fixture, 'button', 'Make new codes…').click();
    await settle(security.fixture);

    expect(security.dialog.opened[0]).toEqual({ component: NewCodesDialog, data: 3 });
  });

  it('shows the new recovery codes', async () => {
    const codes = ['aaaa-bbbb-cccc-dddd'];
    const security = await render(aSignedInUser(), new ClosingDialog(codes));

    byRole(security.fixture, 'button', 'Make new codes…').click();
    (await nextRequest(security.backend, '/api/auth/me')).flush(aSignedInUser());

    await vi.waitFor(() =>
      expect(security.dialog.opened[1]).toEqual({ component: RecoveryCodesDialog, data: codes }),
    );
  });

  it('sends a single sign-on user to the identity provider', async () => {
    const { fixture } = await render(aSignedInUser({ singleSignOn: true }));

    expect(textOf(fixture)).toContain(
      'Your password and two-step sign-in are set there, not in Apiary.',
    );
  });
});
