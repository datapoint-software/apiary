import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { Role, StreamRouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem, aProject, aSignedInUser, aStreamRoute } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { StreamDialog } from './stream-dialog';
import { StreamList } from './stream-list';

const now = new Date('2026-11-04T12:00:00Z');
const mqtt = aStreamRoute({ id: 'stream-1', name: 'MQTT', listenPort: 1883, protocol: 'tcp' });

interface Rendered {
  readonly fixture: ComponentFixture<StreamList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(
  streams: StreamRouteView[],
  role: Role = 'operator',
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(StreamList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/streams/list').flush(streams);
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

afterEach(() => vi.useRealTimers());

describe('StreamList', () => {
  it('shows each stream route’s port and protocol', async () => {
    const { fixture } = await render([aStreamRoute({ listenPort: 5514, protocol: 'udp' })]);

    expect(
      [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody td:nth-child(2) span'),
      ].map((span) => span.textContent),
    ).toEqual(['5514', 'UDP']);
  });

  it('shows each stream route’s target, project and connections', async () => {
    const { fixture } = await render([
      aStreamRoute({ name: 'MQTT', targetHost: 'mqtt', targetPort: 8883, connections: 3 }),
    ]);

    expect(cellsOfRow(fixture, 'MQTT').slice(2, 6)).toEqual(['mqtt:8883', 'Shop', 'Active', '3']);
  });

  it('lists the TLS server names a route takes', async () => {
    const { fixture } = await render([
      aStreamRoute({ serverNames: ['mqtt.example.com', '*.example.com'] }),
    ]);

    expect(textOf(fixture)).toContain('mqtt.example.com, *.example.com');
  });

  it('says a route has an allowlist', async () => {
    const { fixture } = await render([aStreamRoute({ allowedAddresses: ['10.0.0.0/8'] })]);

    expect(cellsOfRow(fixture, 'MQTT')[4]).toContain('Allowlist');
  });

  it.each([
    [aStreamRoute({ disabled: true }), 'Disabled'],
    [aStreamRoute({ lastConnectionAt: '2026-11-04T11:30:00Z' }), 'Active'],
    [aStreamRoute({ lastConnectionAt: '2026-11-04T09:00:00Z' }), 'Last connection 3 hours ago'],
  ])('describes how recently a route was used', async (stream, status) => {
    const { fixture } = await render([stream]);

    expect(cellsOfRow(fixture, 'MQTT')[4]).toBe(status);
  });

  it('explains stream routes when there are none', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No stream routes')).toBeTruthy();
  });

  it('offers a viewer no way to add or change stream routes', async () => {
    const { fixture } = await render([mqtt], 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Add stream route'),
      queryByRole(fixture, 'button', 'Edit MQTT'),
    ]).toEqual([undefined, undefined]);
  });

  it('opens the dialog to add a stream route', async () => {
    const list = await render([]);

    await press(list, 'Add stream route');

    expect(list.dialog.opened[0]).toEqual({ component: StreamDialog, data: null });
  });

  it('says a new stream route is ready', async () => {
    const list = await render(
      [mqtt],
      'operator',
      new ClosingDialog({ name: 'Syslog', added: true }),
    );

    byRole(list.fixture, 'button', 'Add stream route').click();

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Syslog is ready on every replica.'),
    );
  });

  it('opens the dialog to edit a stream route', async () => {
    const list = await render(
      [mqtt],
      'operator',
      new ClosingDialog({ name: 'MQTT', added: false }),
    );

    byRole(list.fixture, 'button', 'Edit MQTT').click();

    await vi.waitFor(() =>
      expect([list.dialog.opened[0].data, TestBed.inject(Toaster).toasts()[0].text]).toEqual([
        mqtt,
        'MQTT saved.',
      ]),
    );
  });

  it('disables a stream route once confirmed', async () => {
    const list = await render([mqtt]);

    byRole(list.fixture, 'button', 'Disable MQTT').click();
    const request = await nextRequest(list.backend, '/api/streams/disable');
    request.flush(null);

    expect([request.request.body, list.confirmer.asked[0].text]).toEqual([
      { id: 'stream-1' },
      'Every replica stops listening on port 1883/TCP and closes open connections until you enable it again. Its settings are kept.',
    ]);
    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()[0].text).toBe('MQTT disabled.'));
  });

  it('undoes disabling a stream route', async () => {
    const list = await render([mqtt]);
    byRole(list.fixture, 'button', 'Disable MQTT').click();
    (await nextRequest(list.backend, '/api/streams/disable')).flush(null);
    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()).toHaveLength(1));

    TestBed.inject(Toaster).toasts()[0].action?.run();
    const request = await nextRequest(list.backend, '/api/streams/enable');

    expect(request.request.body).toEqual({ id: 'stream-1' });
  });

  it('enables a disabled stream route', async () => {
    const list = await render([aStreamRoute({ ...mqtt, disabled: true })]);

    byRole(list.fixture, 'button', 'Enable MQTT').click();
    (await nextRequest(list.backend, '/api/streams/enable')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('MQTT enabled. Traffic flows again.'),
    );
  });

  it('explains why a stream route wasn’t enabled', async () => {
    const list = await render([aStreamRoute({ ...mqtt, disabled: true })]);

    byRole(list.fixture, 'button', 'Enable MQTT').click();
    (await nextRequest(list.backend, '/api/streams/enable')).flush(
      aProblem(409, 'stream.portTaken'),
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        text: 'Another stream route already uses this port and protocol. Choose another port, or give both TCP routes different TLS server names.',
        tone: 'error',
      }),
    );
  });

  it('deletes a stream route once confirmed', async () => {
    const list = await render([mqtt]);

    byRole(list.fixture, 'button', 'Delete MQTT').click();
    const request = await nextRequest(list.backend, '/api/streams/delete');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'stream-1' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('MQTT was deleted.'),
    );
  });
});
