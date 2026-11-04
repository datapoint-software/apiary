import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { NewCodesDialog } from './new-codes-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<NewCodesDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(left = 3): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: left },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(NewCodesDialog);
  const backend = TestBed.inject(HttpTestingController);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function make({ fixture }: Rendered, password: string): Promise<void> {
  type(byLabel(fixture, 'Your password'), password);
  await settle(fixture);
  byRole(fixture, 'button', 'Make new codes').click();
  await settle(fixture);
}

describe('NewCodesDialog', () => {
  it.each([
    [1, 'Your 1 remaining code stops working, and you get 10 new ones.'],
    [3, 'Your 3 remaining codes stop working, and you get 10 new ones.'],
  ])('warns that the %i remaining codes stop working', async (left, warning) => {
    const { fixture } = await render(left);

    expect(textOf(fixture)).toContain(warning);
  });

  it('asks for the password', async () => {
    const dialog = await render();

    await make(dialog, '');

    expect(errorOf(dialog.fixture, 'Your password')).toBe('Fill this in.');
  });

  it('closes with the new codes', async () => {
    const dialog = await render();

    await make(dialog, 'a long passphrase');
    const request = await nextRequest(dialog.backend, '/api/account/new-recovery-codes');
    request.flush(['aaaa-bbbb-cccc-dddd']);

    expect(request.request.body).toEqual({ password: 'a long passphrase' });
    await vi.waitFor(() => expect(dialog.ref.results).toEqual([['aaaa-bbbb-cccc-dddd']]));
  });

  it('shows a wrong password on its field', async () => {
    const dialog = await render();

    await make(dialog, 'a wrong passphrase');
    (await nextRequest(dialog.backend, '/api/account/new-recovery-codes')).flush(
      aProblem(400, 'validation.failed', [{ field: 'password', code: 'password.incorrect' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Your password')).toBe('That isn’t your current password.');
  });

  it('closes without codes when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
