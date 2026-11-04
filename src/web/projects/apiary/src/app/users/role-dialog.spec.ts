import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aUser } from '../testing/builders';
import { alertsOf, byRole, settle } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RoleDialog } from './role-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<RoleDialog>;
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
      {
        provide: DIALOG_DATA,
        useValue: aUser({ id: 'user-2', name: 'Rui Costa', role: 'operator' }),
      },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(RoleDialog);
  const backend = TestBed.inject(HttpTestingController);
  await settle(fixture);
  return { fixture, backend, ref };
}

function roleChoice(fixture: ComponentFixture<RoleDialog>, role: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    `input[type="radio"][value="${role}"]`,
  ) as HTMLInputElement;
}

async function changeTo({ fixture }: Rendered, role: string): Promise<void> {
  roleChoice(fixture, role).click();
  await settle(fixture);
  byRole(fixture, 'button', 'Change role').click();
  await settle(fixture);
}

describe('RoleDialog', () => {
  it('names the user whose role changes', async () => {
    const { fixture } = await render();

    expect(byRole(fixture, 'heading', 'Change the role of Rui Costa')).toBeTruthy();
  });

  it('starts from the user’s current role', async () => {
    const { fixture } = await render();

    expect(roleChoice(fixture, 'operator').checked).toBe(true);
  });

  it('sends the role chosen', async () => {
    const dialog = await render();

    await changeTo(dialog, 'administrator');
    const request = await nextRequest(dialog.backend, '/api/users/change-role');

    expect(request.request.body).toEqual({ id: 'user-2', role: 'administrator' });
  });

  it('closes with the new role', async () => {
    const dialog = await render();

    await changeTo(dialog, 'viewer');
    (await nextRequest(dialog.backend, '/api/users/change-role')).flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['viewer']));
  });

  it('explains why the role didn’t change', async () => {
    const dialog = await render();

    await changeTo(dialog, 'viewer');
    (await nextRequest(dialog.backend, '/api/users/change-role')).flush(
      aProblem(409, 'user.lastAdministrator'),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(dialog.fixture);

    expect(alertsOf(dialog.fixture)).toContain(
      'This is the only active administrator. Make someone else an administrator first.',
    );
  });

  it('closes without a result when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
