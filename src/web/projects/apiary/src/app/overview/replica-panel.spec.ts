import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BackupStatus, ClusterView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { answerAll } from '../testing/answer-all';
import { aCluster, aMember, aSignedInUser } from '../testing/builders';
import { definitionOf, textOf } from '../testing/dom';
import { ReplicaPanel } from './replica-panel';

const cluster = aCluster({
  members: [
    aMember({ id: 'm-1', node: 'node-a', address: '10.0.0.1:7946', role: 'leader' }),
    aMember({ id: 'm-2', node: undefined, address: '10.0.0.2:7946' }),
    aMember({ id: 'm-3', node: 'node-c', address: '10.0.0.3:7946', reachable: false }),
    aMember({ id: 'm-4', node: 'node-d', address: '10.0.0.4:7946', role: 'joining' }),
  ],
});

async function render(
  backups: BackupStatus = { changesSince: 0 },
  role: Role = 'administrator',
  view: ClusterView = cluster,
): Promise<ComponentFixture<ReplicaPanel>> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(ReplicaPanel);
  await answerAll(fixture, TestBed.inject(HttpTestingController), {
    '/api/cluster/status': view,
    '/api/backups/status': backups,
  });
  return fixture;
}

describe('ReplicaPanel', () => {
  afterEach(() => vi.useRealTimers());

  it('shows each voter and its role', async () => {
    const fixture = await render();

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="listitem"]')].map((n) =>
        n.textContent?.trim(),
      ),
    ).toEqual(['1node-aLeader', '210.0.0.2:7946Voter', '3node-cUnreachable']);
  });

  it('names the leader and counts the reachable voters', async () => {
    const fixture = await render();

    expect([definitionOf(fixture, 'Leader'), definitionOf(fixture, 'Voters')]).toEqual([
      'node-a',
      '2 of 3 reachable',
    ]);
  });

  it('says when there is no leader', async () => {
    const fixture = await render({ changesSince: 0 }, 'administrator', aCluster());

    expect(definitionOf(fixture, 'Leader')).toBe('None');
  });

  it('says when the last backup was taken', async () => {
    const fixture = await render({ lastAt: '2026-11-03T12:00:00Z', changesSince: 0 });

    expect(definitionOf(fixture, 'Last backup')).toBe('yesterday');
  });

  it('says when no backup was ever taken', async () => {
    const fixture = await render();

    expect(definitionOf(fixture, 'Last backup')).toBe('Never');
  });

  it('shows backups only to an administrator', async () => {
    const fixture = await render({ changesSince: 0 }, 'operator');

    expect(textOf(fixture)).not.toContain('Last backup');
  });
});
