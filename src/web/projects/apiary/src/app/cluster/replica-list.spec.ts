import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { ClusterView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { nextRequest } from '../testing/backend';
import { aCluster, aMember, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import {
  byLabel,
  byRole,
  cellsOfRow,
  errorOf,
  queryByRole,
  settle,
  textOf,
  type,
} from '../testing/dom';
import { RecoveryDialog } from './recovery-dialog';
import { ReplicaList } from './replica-list';

const now = new Date('2026-11-04T12:00:00Z');

async function render(cluster: ClusterView, role: Role = 'administrator') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  const dialog = new ClosingDialog();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(ReplicaList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/cluster/status').flush(cluster);
  await settle(fixture);
  return { fixture, backend, confirmer, dialog };
}

function replicaNames(fixture: ComponentFixture<ReplicaList>): string[] {
  const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')];
  return rows.map((row) => row.querySelector('td .ap-data')?.firstChild?.textContent?.trim() ?? '');
}

function modeChoice(fixture: ComponentFixture<ReplicaList>, mode: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    `input[type="radio"][value="${mode}"]`,
  ) as HTMLInputElement;
}

afterEach(() => vi.useRealTimers());

describe('ReplicaList', () => {
  it('lists the replicas by name', async () => {
    const { fixture } = await render(
      aCluster({
        members: [
          aMember({ id: 'member-3', node: 'node-c', address: '10.0.0.3:7946' }),
          aMember({ id: 'member-1', node: 'node-a', address: '10.0.0.1:7946' }),
          aMember({ id: 'member-2', node: 'node-b', address: '10.0.0.2:7946' }),
        ],
      }),
    );

    expect(replicaNames(fixture)).toEqual(['node-a', 'node-b', 'node-c']);
  });

  it.each([
    ['a reachable voter', aMember({ address: '10.0.0.1:7946' }), 'In sync'],
    ['a joining replica', aMember({ address: '10.0.0.1:7946', role: 'joining' }), 'Catching up'],
    [
      'an unreachable replica',
      aMember({ address: '10.0.0.1:7946', reachable: false }),
      'Unreachable',
    ],
    [
      'a replica missing for a while',
      aMember({ address: '10.0.0.1:7946', reachable: false, missingSince: '2026-11-04T11:40:00Z' }),
      'Missing for 20 minutes',
    ],
  ])('shows the status of %s', async (situation, member, expected) => {
    const { fixture } = await render(aCluster({ members: [member] }));

    expect(cellsOfRow(fixture, '10.0.0.1:7946')[3]).toBe(expected);
  });

  it('offers an administrator to remove an unreachable replica', async () => {
    const { fixture } = await render(aCluster({ members: [aMember({ reachable: false })] }));

    expect(queryByRole(fixture, 'button', 'Remove now…')).toBeDefined();
  });

  it('offers no way to remove a reachable replica', async () => {
    const { fixture } = await render(aCluster({ members: [aMember({ reachable: true })] }));

    expect(queryByRole(fixture, 'button', 'Remove now…')).toBeUndefined();
  });

  it('offers an operator no way to remove a replica', async () => {
    const { fixture } = await render(
      aCluster({ members: [aMember({ reachable: false })] }),
      'operator',
    );

    expect(queryByRole(fixture, 'button', 'Remove now…')).toBeUndefined();
  });

  it('explains that a standalone instance has nothing to replicate', async () => {
    const { fixture } = await render(aCluster({ mode: 'Standalone' }));

    expect(textOf(fixture)).toContain(
      'Apiary runs as one instance, so there’s nothing to replicate.',
    );
  });

  it('shows the cluster’s membership settings', async () => {
    const { fixture } = await render(
      aCluster({ membership: { mode: 'automatic', removeMissingAfterMinutes: 30 } }),
    );

    expect(byLabel(fixture, 'Remove missing replicas after').value).toBe('30');
  });

  it('raises a delay below 5 minutes to 5', async () => {
    const { fixture } = await render(
      aCluster({ membership: { mode: 'automatic', removeMissingAfterMinutes: 2 } }),
    );

    expect(byLabel(fixture, 'Remove missing replicas after').value).toBe('5');
  });

  it('shows manual membership without a delay', async () => {
    const { fixture } = await render(
      aCluster({ membership: { mode: 'manual', removeMissingAfterMinutes: 30 } }),
    );

    expect(modeChoice(fixture, 'manual').checked).toBe(true);
    expect(() => byLabel(fixture, 'Remove missing replicas after')).toThrow();
  });

  it('keeps the delay before removing missing replicas between 5 and 1440 minutes', async () => {
    const { fixture, backend } = await render(aCluster());

    type(byLabel(fixture, 'Remove missing replicas after'), '2');
    byRole(fixture, 'button', 'Save').click();
    await settle(fixture);

    expect(errorOf(fixture, 'Remove missing replicas after')).toBe(
      'Enter a number from 5 to 1440.',
    );
    backend.expectNone('/api/cluster/update-membership');
  });

  it('saves the membership settings', async () => {
    const { fixture, backend } = await render(aCluster());

    type(byLabel(fixture, 'Remove missing replicas after'), '45');
    byRole(fixture, 'button', 'Save').click();
    const request = await nextRequest(backend, '/api/cluster/update-membership');

    expect(request.request.body).toEqual({ mode: 'automatic', removeMissingAfterMinutes: 45 });
  });

  it('confirms the membership settings once saved', async () => {
    const { fixture, backend } = await render(aCluster());

    type(byLabel(fixture, 'Remove missing replicas after'), '45');
    byRole(fixture, 'button', 'Save').click();
    (await nextRequest(backend, '/api/cluster/update-membership')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Membership saved',
        text: 'New replicas join on their own, and missing ones are removed after 45 minutes.',
      }),
    );
  });

  it('saves manual membership', async () => {
    const { fixture, backend } = await render(aCluster());

    modeChoice(fixture, 'manual').click();
    await settle(fixture);
    byRole(fixture, 'button', 'Save').click();
    (await nextRequest(backend, '/api/cluster/update-membership')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'New replicas now wait for your approval, and missing ones stay until you remove them.',
      ),
    );
  });

  it('removes an unreachable replica once confirmed', async () => {
    const { fixture, backend } = await render(
      aCluster({ members: [aMember({ id: 'member-2', node: 'node-b', reachable: false })] }),
    );

    byRole(fixture, 'button', 'Remove now…').click();
    const request = await nextRequest(backend, '/api/cluster/remove-replica');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'member-2' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('node-b was removed from the cluster.'),
    );
  });

  it.each([
    [
      'automatic',
      aMember({ node: 'node-b', reachable: false, missingSince: '2026-11-04T11:40:00Z' }),
      'It has been missing for 20 minutes, and would be removed on its own after 15 minutes.',
    ],
    [
      'automatic',
      aMember({ node: 'node-b', reachable: false }),
      'It can’t be reached, and would be removed on its own after 15 minutes.',
    ],
    [
      'manual',
      aMember({ node: 'node-b', reachable: false, missingSince: '2026-11-04T11:40:00Z' }),
      'It has been missing for 20 minutes.',
    ],
    ['manual', aMember({ node: 'node-b', reachable: false }), 'It can’t be reached.'],
  ] as const)(
    'explains what happens to a missing replica with %s membership',
    async (mode, member, explanation) => {
      const { fixture, confirmer } = await render(
        aCluster({ members: [member], membership: { mode, removeMissingAfterMinutes: 15 } }),
      );

      byRole(fixture, 'button', 'Remove now…').click();
      await settle(fixture);

      expect(confirmer.asked[0].text).toBe(
        `${explanation} Once removed, it no longer counts towards the majority. If node-b comes back, its replica joins again as a new replica.`,
      );
    },
  );

  it('opens the recovery dialog', async () => {
    const { fixture, dialog } = await render(aCluster());

    byRole(fixture, 'button', 'Start recovery…').click();
    await settle(fixture);

    expect(dialog.opened[0].component).toBe(RecoveryDialog);
  });

  it('offers recovery to administrators only', async () => {
    const { fixture } = await render(aCluster(), 'operator');

    expect(queryByRole(fixture, 'button', 'Start recovery…')).toBeUndefined();
  });

  it('marks this replica and replicas without a known node', async () => {
    const { fixture } = await render(
      aCluster({
        members: [
          aMember({ address: '10.0.0.1:7946', local: true, node: 'node-a' }),
          aMember({ id: 'member-2', address: '10.0.0.2:7946', node: undefined }),
        ],
      }),
    );

    expect([
      cellsOfRow(fixture, '10.0.0.1:7946')[0],
      cellsOfRow(fixture, '10.0.0.2:7946')[0],
    ]).toEqual([
      expect.stringContaining('node-a (this replica)'),
      expect.stringContaining('Unknown node'),
    ]);
  });
});
