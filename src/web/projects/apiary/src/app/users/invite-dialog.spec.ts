import { DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { InviteDialog } from './invite-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<InviteDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(InviteDialog);
  const backend = TestBed.inject(HttpTestingController);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function fillIn({ fixture }: Rendered, name: string, email: string): Promise<void> {
  type(byLabel(fixture, 'Name'), name);
  type(byLabel(fixture, 'Email'), email);
  await settle(fixture);
}

function roleChoice(fixture: ComponentFixture<InviteDialog>, role: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    `input[type="radio"][value="${role}"]`,
  ) as HTMLInputElement;
}

async function create({ fixture }: Rendered): Promise<void> {
  byRole(fixture, 'button', 'Create invite').click();
  await settle(fixture);
}

describe('InviteDialog', () => {
  it('asks for a name and an email', async () => {
    const dialog = await render();

    await create(dialog);

    expect([errorOf(dialog.fixture, 'Name'), errorOf(dialog.fixture, 'Email')]).toEqual([
      'Fill this in.',
      'Fill this in.',
    ]);
    dialog.backend.expectNone('/api/users/invite');
  });

  it('invites a viewer unless another role is chosen', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Eva Lima', 'eva@example.com');

    await create(dialog);
    const request = await nextRequest(dialog.backend, '/api/users/invite');

    expect(request.request.body).toEqual({
      name: 'Eva Lima',
      email: 'eva@example.com',
      role: 'viewer',
    });
  });

  it('invites with the role chosen', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Eva Lima', 'eva@example.com');
    roleChoice(dialog.fixture, 'operator').click();
    await settle(dialog.fixture);

    await create(dialog);
    const request = await nextRequest(dialog.backend, '/api/users/invite');

    expect(request.request.body.role).toBe('operator');
  });

  it('closes with the link and who it is for', async () => {
    const dialog = await render();
    await fillIn(dialog, ' Eva Lima ', ' eva@example.com ');
    const link = { userId: 'user-9', token: 'token-9', expiresAt: '2026-11-07T12:00:00Z' };

    await create(dialog);
    (await nextRequest(dialog.backend, '/api/users/invite')).flush(link);

    await vi.waitFor(() =>
      expect(dialog.ref.results).toEqual([{ link, email: 'eva@example.com', name: 'Eva Lima' }]),
    );
  });

  it('shows the API’s error on the field it names', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Eva Lima', 'eva@example.com');

    await create(dialog);
    (await nextRequest(dialog.backend, '/api/users/invite')).flush(
      aProblem(400, 'validation.failed', [{ field: 'email', code: 'email.taken' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Email')).toBe(appMessages['email.taken']({}));
  });

  it('closes without a result when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
