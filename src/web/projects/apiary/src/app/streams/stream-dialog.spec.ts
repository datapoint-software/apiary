import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { StreamRouteView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject, aStreamRoute } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { StreamDialog } from './stream-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<StreamDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(existing: StreamRouteView | null = null): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: existing },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(StreamDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel<HTMLInputElement | HTMLTextAreaElement>(fixture, label), value);
  await settle(fixture);
}

async function chooseProtocol({ fixture }: Rendered, protocol: string): Promise<void> {
  (
    (fixture.nativeElement as HTMLElement).querySelector(
      `input[type="radio"][value="${protocol}"]`,
    ) as HTMLInputElement
  ).click();
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

async function fillInMqtt(dialog: Rendered): Promise<void> {
  await fillIn(dialog, 'Name', ' MQTT ');
  await fillIn(dialog, 'Listens on port', '1883');
  await fillIn(dialog, 'Target', ' mqtt ');
  await fillIn(dialog, 'Port', '1883');
}

describe('StreamDialog', () => {
  it('asks for a name, ports and a target', async () => {
    const dialog = await render();

    await press(dialog, 'Add stream route');

    expect(
      ['Name', 'Listens on port', 'Target', 'Port'].map((label) => errorOf(dialog.fixture, label)),
    ).toEqual([
      'Fill this in.',
      'Enter a port, such as 8080.',
      'Enter a target, such as the service name shop-v1.',
      'Enter a port, such as 8080.',
    ]);
  });

  it('keeps names to 40 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'a'.repeat(41));
    await press(dialog, 'Add stream route');

    expect(errorOf(dialog.fixture, 'Name')).toBe('Use at most 40 characters.');
  });

  it('refuses a TLS server name that isn’t a hostname', async () => {
    const dialog = await render();

    await fillIn(dialog, 'TLS server names (optional)', 'not a name');
    await press(dialog, 'Add stream route');

    expect(errorOf(dialog.fixture, 'TLS server names (optional)')).toBe(
      'Enter a hostname, such as shop.example.com.',
    );
  });

  it('adds a TCP stream route with its server names', async () => {
    const dialog = await render();
    await fillInMqtt(dialog);
    await fillIn(dialog, 'TLS server names (optional)', 'MQTT.example.com\n\n*.example.com');
    await fillIn(dialog, 'Allowed addresses (optional)', ' 10.0.0.0/8 \n');

    await press(dialog, 'Add stream route');
    const request = await nextRequest(dialog.backend, '/api/streams/create');

    expect(request.request.body).toEqual({
      projectId: 'project-1',
      name: 'MQTT',
      protocol: 'tcp',
      listenPort: 1883,
      targetHost: 'mqtt',
      targetPort: 1883,
      serverNames: ['mqtt.example.com', '*.example.com'],
      idleTimeoutSeconds: 60,
      allowedAddresses: ['10.0.0.0/8'],
    });
  });

  it('adds a UDP stream route with its idle timeout', async () => {
    const dialog = await render();
    await fillInMqtt(dialog);
    await chooseProtocol(dialog, 'udp');
    await fillIn(dialog, 'Idle timeout', '120');

    await press(dialog, 'Add stream route');
    const request = await nextRequest(dialog.backend, '/api/streams/create');

    expect(request.request.body).toMatchObject({
      protocol: 'udp',
      serverNames: [],
      idleTimeoutSeconds: 120,
    });
  });

  it('keeps a UDP idle timeout between 1 and 3600 seconds', async () => {
    const dialog = await render();
    await chooseProtocol(dialog, 'udp');

    await fillIn(dialog, 'Idle timeout', '0');
    await press(dialog, 'Add stream route');

    expect(errorOf(dialog.fixture, 'Idle timeout')).toBe('Enter a number from 1 to 3600.');
  });

  it('gives the line to publish the new port', async () => {
    const dialog = await render();
    await fillInMqtt(dialog);

    await press(dialog, 'Add stream route');
    (await nextRequest(dialog.backend, '/api/streams/create')).flush('stream-9');
    await vi.waitFor(() =>
      expect(byRole(dialog.fixture, 'heading', 'Publish port 1883')).toBeTruthy(),
    );

    expect(textOf(dialog.fixture)).toContain(
      '- { target: 1883, published: 1883, protocol: tcp, mode: host }',
    );
  });

  it('closes as added once the port is published', async () => {
    const dialog = await render();
    await fillInMqtt(dialog);
    await press(dialog, 'Add stream route');
    (await nextRequest(dialog.backend, '/api/streams/create')).flush('stream-9');
    await vi.waitFor(() => expect(byRole(dialog.fixture, 'button', 'Done')).toBeTruthy());

    byRole(dialog.fixture, 'button', 'Done').click();

    expect(dialog.ref.results).toEqual([{ name: 'MQTT', added: true }]);
  });

  it('shows the stream route being edited', async () => {
    const dialog = await render(
      aStreamRoute({ name: 'MQTT', serverNames: ['a.example.com', 'b.example.com'] }),
    );

    expect([
      byRole(dialog.fixture, 'heading', 'Edit stream route'),
      byLabel<HTMLTextAreaElement>(dialog.fixture, 'TLS server names (optional)').value,
    ]).toEqual([expect.anything(), 'a.example.com\nb.example.com']);
  });

  it('saves the stream route being edited', async () => {
    const dialog = await render(aStreamRoute({ id: 'stream-1' }));
    await fillIn(dialog, 'Target', 'mqtt-v2');

    await press(dialog, 'Save');
    const request = await nextRequest(dialog.backend, '/api/streams/update');

    expect(request.request.body).toMatchObject({ id: 'stream-1', targetHost: 'mqtt-v2' });
  });

  it('closes once saved when the port didn’t change', async () => {
    const dialog = await render(aStreamRoute({ id: 'stream-1' }));
    await fillIn(dialog, 'Target', 'mqtt-v2');

    await press(dialog, 'Save');
    (await nextRequest(dialog.backend, '/api/streams/update')).flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual([{ name: 'MQTT', added: false }]));
  });

  it('shows the API’s error on the field it names', async () => {
    const dialog = await render();
    await fillInMqtt(dialog);

    await press(dialog, 'Add stream route');
    (await nextRequest(dialog.backend, '/api/streams/create')).flush(
      aProblem(400, 'validation.failed', [{ field: 'listenPort', code: 'stream.portReserved' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Listens on port')).toBe(
      'Apiary uses this port itself. Choose another.',
    );
  });

  it('closes without saving when cancelled', async () => {
    const dialog = await render();

    await press(dialog, 'Cancel');

    expect(dialog.ref.results).toEqual([undefined]);
  });

  it('locks the name, ports and target of a stream route from a stack', async () => {
    const dialog = await render(
      aStreamRoute({
        stack: { stack: 'shop', service: 'db', name: 'postgres', fields: ['listen', 'port'] },
      }),
    );

    expect(textOf(dialog.fixture)).toContain('Declared in stack shop');
    expect([
      byLabel(dialog.fixture, 'Name').disabled,
      byLabel(dialog.fixture, 'Allowed addresses (optional)').disabled,
    ]).toEqual([true, false]);
  });
});
