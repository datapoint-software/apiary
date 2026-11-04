import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { TwoStepEnrollment } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { TwoStepDialog } from './two-step-dialog';

const enrollment: TwoStepEnrollment = {
  challenge: 'challenge-1',
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DP',
  uri: 'otpauth://totp/Apiary:ana@example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DP',
};

interface Rendered {
  readonly fixture: ComponentFixture<TwoStepDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: enrollment },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(TwoStepDialog);
  const backend = TestBed.inject(HttpTestingController);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function turnOn({ fixture }: Rendered, code: string, password: string): Promise<void> {
  type(byLabel(fixture, 'Code from the app'), code);
  type(byLabel(fixture, 'Your password'), password);
  await settle(fixture);
  byRole(fixture, 'button', 'Turn on').click();
  await settle(fixture);
}

describe('TwoStepDialog', () => {
  it('shows the QR code to scan', async () => {
    const { fixture } = await render();

    expect(byRole(fixture, 'img', 'QR code for your authenticator app')).toBeTruthy();
  });

  it('shows the key in groups of four for typing it in', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain('JBSW Y3DP EHPK 3PXP JBSW Y3DP');
  });

  it('asks for six digits and the password', async () => {
    const dialog = await render();

    await turnOn(dialog, '12345', '');

    expect([
      errorOf(dialog.fixture, 'Code from the app'),
      errorOf(dialog.fixture, 'Your password'),
    ]).toEqual(['Enter the 6 digits the app shows.', 'Fill this in.']);
  });

  it('sends the code and password with the challenge', async () => {
    const dialog = await render();

    await turnOn(dialog, '123456', 'a long passphrase');
    const request = await nextRequest(dialog.backend, '/api/account/confirm-two-step');
    request.flush(null);

    expect(request.request.body).toEqual({
      challenge: 'challenge-1',
      code: '123456',
      password: 'a long passphrase',
    });
    await vi.waitFor(() => expect(dialog.ref.results).toEqual([true]));
  });

  it('shows a refused code on the code field', async () => {
    const dialog = await render();

    await turnOn(dialog, '123456', 'a long passphrase');
    (await nextRequest(dialog.backend, '/api/account/confirm-two-step')).flush(
      aProblem(400, 'validation.failed', [{ field: 'code', code: 'code.invalid' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Code from the app')).toBe(
      'That code didn’t work. Check that your phone’s clock is right, then try the newest code.',
    );
  });

  it('closes without turning it on when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
