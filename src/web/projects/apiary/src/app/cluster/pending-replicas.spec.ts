import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { PendingReplica, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aCluster, aProblem, aSignedInUser } from '../testing/builders';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { PendingReplicas } from './pending-replicas';

const now = new Date('2026-11-04T12:00:00Z');
const waiting: PendingReplica = {
  id: 'replica-9',
  node: 'node-d',
  address: '10.0.0.4:7946',
  since: '2026-11-04T11:55:00Z',
};

interface Rendered {
  readonly fixture: ComponentFixture<PendingReplicas>;
  readonly backend: HttpTestingController;
}

async function render(pending: PendingReplica[], role: Role = 'administrator'): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideErrorMessages(appMessages)],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(PendingReplicas);
  const backend = TestBed.inject(HttpTestingController);
  await answerClusterStatus(backend, aCluster({ pending }));
  await settle(fixture);
  return { fixture, backend };
}

afterEach(() => vi.useRealTimers());

describe('PendingReplicas', () => {
  it('lists the replicas asking to join', async () => {
    const { fixture } = await render([waiting]);

    expect(cellsOfRow(fixture, 'node-d').slice(1)).toEqual([
      '10.0.0.4:7946',
      '5 minutes ago',
      'Approve',
    ]);
  });

  it('shows nothing while no replica is waiting', async () => {
    const { fixture } = await render([]);

    expect(textOf(fixture)).toBe('');
  });

  it('offers an operator no way to approve a replica', async () => {
    const { fixture } = await render([waiting], 'operator');

    expect(queryByRole(fixture, 'button', 'Approve')).toBeUndefined();
  });

  it('approves a replica', async () => {
    const { fixture, backend } = await render([waiting]);

    byRole(fixture, 'button', 'Approve').click();
    const request = await nextRequest(backend, '/api/cluster/approve-replica');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'replica-9' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Replica approved',
        text: 'The replica on node-d joins in a few seconds, then catches up and starts serving traffic.',
      }),
    );
  });

  it('explains why a replica wasn’t approved', async () => {
    const { fixture, backend } = await render([waiting]);

    byRole(fixture, 'button', 'Approve').click();
    (await nextRequest(backend, '/api/cluster/approve-replica')).flush(
      aProblem(403, 'auth.forbidden'),
      { status: 403, statusText: 'Forbidden' },
    );

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Couldn’t approve',
        text: 'Your role doesn’t allow this. Ask an Administrator if you need it.',
      }),
    );
  });

  it('says when Apiary didn’t answer the approval', async () => {
    const { fixture, backend } = await render([waiting]);

    byRole(fixture, 'button', 'Approve').click();
    (await nextRequest(backend, '/api/cluster/approve-replica')).error(new ProgressEvent('error'));

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Apiary didn’t answer. Check your connection and try again.',
      ),
    );
  });
});
