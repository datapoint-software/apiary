import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { TrustedProxyView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aTrustedProxy } from '../testing/builders';
import { byLabel, byRole, errorOf, queryByRole, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { TrustedProxyDialog } from './trusted-proxy-dialog';

const loadBalancer = aTrustedProxy({ id: 'proxy-1', range: '10.20.30.0/24', note: 'Load balancer' });

interface Rendered {
  readonly fixture: ComponentFixture<TrustedProxyDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(proxy: TrustedProxyView | null = null, proxies: readonly TrustedProxyView[] = [loadBalancer]): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: { proxy, proxies } },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(TrustedProxyDialog);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController), ref };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

describe('TrustedProxyDialog', () => {
  it('asks for an address or range', async () => {
    const dialog = await render();

    await press(dialog, 'Add proxy');

    expect(errorOf(dialog.fixture, 'Address or range')).toBe('Fill this in.');
  });

  it('refuses a range that trusts everyone', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', '0.0.0.0/0');
    await press(dialog, 'Add proxy');

    expect(errorOf(dialog.fixture, 'Address or range')).toContain('This would trust every address');
  });

  it('refuses a range that is already on the list', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', '10.20.30.0/24');
    await press(dialog, 'Add proxy');

    expect(errorOf(dialog.fixture, 'Address or range')).toBe('This range is already on the list.');
  });

  it('adds a proxy and closes with its range', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', ' 192.0.2.0/24 ');
    await fillIn(dialog, 'What it is (optional)', ' Edge ');
    await press(dialog, 'Add proxy');
    const request = await nextRequest(dialog.backend, '/api/trusted-proxies/add');
    request.flush('proxy-2');

    await vi.waitFor(() => expect(dialog.ref.results).toEqual([{ range: '192.0.2.0/24', added: true }]));
    expect(request.request.body).toEqual({ range: '192.0.2.0/24', note: 'Edge' });
  });

  it('sends no note when it is empty', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', '192.0.2.0/24');
    await press(dialog, 'Add proxy');

    expect((await nextRequest(dialog.backend, '/api/trusted-proxies/add')).request.body).toEqual({ range: '192.0.2.0/24', note: null });
  });

  it('edits a proxy, which may keep its own range', async () => {
    const dialog = await render(loadBalancer);

    await fillIn(dialog, 'What it is (optional)', 'Load balancer in front of the edge nodes');
    await press(dialog, 'Save');
    const request = await nextRequest(dialog.backend, '/api/trusted-proxies/update');
    request.flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual([{ range: '10.20.30.0/24', added: false }]));
    expect(request.request.body).toEqual({ id: 'proxy-1', range: '10.20.30.0/24', note: 'Load balancer in front of the edge nodes' });
  });

  it('titles the dialog with the range it edits', async () => {
    const { fixture } = await render(loadBalancer);

    expect(byRole(fixture, 'heading', 'Edit 10.20.30.0/24')).toBeTruthy();
  });

  it('warns about a public range', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', '173.245.48.0/20');

    expect(textOf(dialog.fixture)).toContain('173.245.48.0/20 is a public range');
  });

  it.each(['192.168.0.0/16', '173.245'])('doesn’t warn about %s', async (range) => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', range);

    expect(textOf(dialog.fixture)).not.toContain('is a public range');
  });

  it('shows the server’s error on the range', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Address or range', '192.0.2.0/24');
    await press(dialog, 'Add proxy');
    (await nextRequest(dialog.backend, '/api/trusted-proxies/add')).flush(
      aProblem(400, 'validation.failed', [{ field: 'range', code: 'ipRange.tooMany' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect([errorOf(dialog.fixture, 'Address or range'), dialog.ref.results]).toEqual([
      'Use 100 addresses or ranges at most. Combine neighbors into a wider range.',
      [],
    ]);
  });

  it('closes without saving on cancel', async () => {
    const dialog = await render();

    await press(dialog, 'Cancel');

    expect([dialog.ref.results, queryByRole(dialog.fixture, 'button', 'Saving…')]).toEqual([[undefined], undefined]);
  });
});
