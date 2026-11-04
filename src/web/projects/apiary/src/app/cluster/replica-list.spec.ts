import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClusterView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { nextRequest } from '../testing/backend';
import { aCluster, aMember, aSignedInUser } from '../testing/builders';
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
import { ReplicaList } from './replica-list';

const now = new Date('2026-11-04T12:00:00Z');

async function render(cluster: ClusterView, role: Role = 'administrator') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(ReplicaList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/cluster/status').flush(cluster);
  await settle(fixture);
  return { fixture, backend };
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
});
