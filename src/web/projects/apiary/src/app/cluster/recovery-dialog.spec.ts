import { DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { RecoveryPlan } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import {
  alertsOf,
  allByRole,
  byLabel,
  byRole,
  errorOf,
  queryByRole,
  settle,
  textOf,
  type,
} from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RecoveryDialog } from './recovery-dialog';

const needed: RecoveryPlan = {
  needed: true,
  node: 'node-a',
  index: 120,
  lastChangeAt: '2026-11-04T10:00:00Z',
  survivors: [{ node: 'node-a', address: '10.0.0.1:7946', index: 120 }],
  unreachable: ['node-b', 'node-c'],
};

interface Rendered {
  readonly fixture: ComponentFixture<RecoveryDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(plan: RecoveryPlan = needed): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(RecoveryDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/cluster/recovery-plan').flush(plan);
  await settle(fixture);
  return { fixture, backend, ref };
}

function checkboxes(fixture: ComponentFixture<RecoveryDialog>): HTMLInputElement[] {
  return [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    ),
  ];
}

async function checkEverything({ fixture }: Rendered): Promise<void> {
  checkboxes(fixture).forEach((box) => box.click());
  await settle(fixture);
}

async function reachConfirmation(dialog: Rendered): Promise<void> {
  await checkEverything(dialog);
  byRole(dialog.fixture, 'button', 'Continue').click();
  await settle(dialog.fixture);
}

async function recover(
  dialog: Rendered,
  node: string,
  password = 'a long passphrase',
  code = '123456',
): Promise<void> {
  type(byLabel(dialog.fixture, 'Type node-a to confirm'), node);
  type(byLabel(dialog.fixture, 'Your password'), password);
  type(byLabel(dialog.fixture, 'Code from your authenticator app'), code);
  await settle(dialog.fixture);
  byRole(dialog.fixture, 'button', 'Recover cluster').click();
  await settle(dialog.fixture);
}

describe('RecoveryDialog', () => {
  it('names the replicas that can’t be reached and how far this one got', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain(
      'node-b and node-c can’t be reached. If they can come back, wait for them instead: recovery can’t be undone. This replica has every change up to 120, the last one at 2026-11-04 10:00 UTC.',
    );
  });

  it('continues only once every check is ticked', async () => {
    const dialog = await render();

    checkboxes(dialog.fixture)[0].click();
    await settle(dialog.fixture);

    expect(byRole<HTMLButtonElement>(dialog.fixture, 'button', 'Continue').disabled).toBe(true);
  });

  it('continues once every check is ticked', async () => {
    const dialog = await render();

    await checkEverything(dialog);

    expect(byRole<HTMLButtonElement>(dialog.fixture, 'button', 'Continue').disabled).toBe(false);
  });

  it('says when recovery isn’t needed', async () => {
    const { fixture } = await render({ ...needed, needed: false });

    expect([textOf(fixture), queryByRole(fixture, 'button', 'Continue')]).toEqual([
      expect.stringContaining('Recovery isn’t needed'),
      undefined,
    ]);
  });

  it('sends the user to a replica with more changes', async () => {
    const { fixture } = await render({
      ...needed,
      survivors: [{ node: 'node-b', address: '10.0.0.2:7946', index: 130 }],
    });

    expect(textOf(fixture)).toContain(
      'It has changes up to 130, and this replica only up to 120. Open the admin interface on node-b and recover from there, so nothing more is lost.',
    );
  });

  it('offers to check again when the plan didn’t load', async () => {
    const ref = new RecordingDialogRef();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideErrorMessages(appMessages),
        { provide: DialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(RecoveryDialog);
    const backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    backend.expectOne('/api/cluster/recovery-plan').error(new ProgressEvent('error'));
    await settle(fixture);

    byRole(fixture, 'button', 'Try again').click();
    (await nextRequest(backend, '/api/cluster/recovery-plan')).flush(needed);
    await settle(fixture);

    expect(byRole(fixture, 'heading', 'Recover the cluster from node-a')).toBeTruthy();
  });

  it('asks to type the replica’s name', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, 'node-b');

    expect(errorOf(dialog.fixture, 'Type node-a to confirm')).toBe(
      'That isn’t this replica’s name. Type it exactly as shown.',
    );
    dialog.backend.expectNone('/api/cluster/recover');
  });

  it('asks for the name, password and code', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, '', '', '');

    expect(
      ['Type node-a to confirm', 'Your password', 'Code from your authenticator app'].map((label) =>
        errorOf(dialog.fixture, label),
      ),
    ).toEqual(['Type the replica’s name to confirm.', 'Fill this in.', 'Fill this in.']);
  });

  it('sends the name, password and code', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, ' node-a ');
    const request = await nextRequest(dialog.backend, '/api/cluster/recover');

    expect(request.request.body).toEqual({
      node: 'node-a',
      password: 'a long passphrase',
      code: '123456',
    });
  });

  it('says what to do once the replica restarts', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, 'node-a');
    (await nextRequest(dialog.backend, '/api/cluster/recover')).flush(null);

    await vi.waitFor(() =>
      expect(allByRole(dialog.fixture, 'heading')).toEqual(['node-a is restarting']),
    );
  });

  it('shows a refused code on the code field', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, 'node-a');
    (await nextRequest(dialog.backend, '/api/cluster/recover')).flush(
      aProblem(400, 'validation.failed', [{ field: 'code', code: 'code.invalid' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Code from your authenticator app')).toBe(
      'That code didn’t work. Check that your phone’s clock is right, then try the newest code.',
    );
  });

  it('explains why the cluster wasn’t recovered', async () => {
    const dialog = await render();
    await reachConfirmation(dialog);

    await recover(dialog, 'node-a');
    (await nextRequest(dialog.backend, '/api/cluster/recover')).flush(
      aProblem(409, 'cluster.otherReplica'),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(dialog.fixture);

    expect(alertsOf(dialog.fixture)).toContain(
      'This request reached a different replica from the one you checked, so nothing changed. Close this and start again.',
    );
  });

  it('closes when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
