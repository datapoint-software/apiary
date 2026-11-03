import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PageHead, Status, Tone } from '@datapoint/apiary-ui';
import { MemberView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { ClusterStatus } from './cluster-status';

const roles = { leader: 'Leader', voter: 'Voter', joining: 'Joining' } as const;

@Component({
  selector: 'ap-replica-list',
  imports: [PageHead, Status],
  templateUrl: './replica-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplicaList {
  protected readonly cluster = inject(ClusterStatus);
  protected readonly roles = roles;
  protected readonly timeAgo = timeAgo;
  protected readonly members = computed(() =>
    [...(this.cluster.view.value()?.members ?? [])].sort((a, b) => (a.node ?? a.address).localeCompare(b.node ?? b.address)),
  );

  protected status(member: MemberView): [Tone, string] {
    if (!member.reachable) {
      return ['critical', 'Unreachable'];
    }
    if (member.role === 'joining') {
      return ['info', 'Catching up'];
    }
    return ['ok', 'In sync'];
  }
}
