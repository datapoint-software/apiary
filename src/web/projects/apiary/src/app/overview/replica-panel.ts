import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { BackupStatus, MemberView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { ClusterStatus } from '../cluster/cluster-status';

@Component({
  selector: 'ap-replica-panel',
  imports: [RouterLink, Status, TranslatePipe],
  template: `
    <section class="ap-panel" aria-labelledby="replicas-title">
      <div class="ap-panel-head">
        <h2 class="ap-h ap-h-2" id="replicas-title">{{ 'Replicas' | t }}</h2>
        <a class="ap-caption" style="color: var(--honey-text)" routerLink="/replicas">{{ 'Manage replicas' | t }}</a>
      </div>
      <div class="ap-panel-body ap-stack">
        <div class="ap-cluster" role="list" [attr.aria-label]="'Replicas' | t">
          @for (member of cluster.voters(); track member.address; let i = $index) {
            <div class="ap-node" [class]="'ap-node-' + nodeClass(member)" role="listitem">
              <span class="ap-node-hex" aria-hidden="true">{{ i + 1 }}</span>
              <span class="ap-node-name">{{ member.node ?? member.address }}</span>
              <span class="ap-node-role">{{ (member.reachable ? roleName(member) : 'Unreachable') | t }}</span>
            </div>
          }
        </div>
        <dl class="ap-kv">
          <dt>{{ 'Leader' | t }}</dt>
          <dd><span class="ap-data">{{ leader() }}</span></dd>
          <dt>{{ 'Voters' | t }}</dt>
          <dd>{{ '{reachable} of {total} reachable' | t: { reachable: cluster.reachable(), total: cluster.voters().length } }}</dd>
          @if (auth.canAdminister()) {
            <dt>{{ 'Last backup' | t }}</dt>
            <dd><ap-status [tone]="backupTone()">{{ backupText() }}</ap-status></dd>
          }
        </dl>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplicaPanel {
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly cluster = inject(ClusterStatus);
  private readonly backups = httpResource<BackupStatus>(() => (this.auth.canAdminister() ? this.api.query('backups.status') : undefined));
  protected readonly leader = computed(() => {
    const leader = this.cluster.voters().find((m) => m.role === 'leader');
    return leader ? (leader.node ?? leader.address) : this.i18n.t('None');
  });
  protected readonly backupTone = computed(() => {
    const at = this.backups.value()?.lastAt;
    return at && Date.now() - Date.parse(at) <= 7 * 86_400_000 ? 'ok' : 'warn';
  });
  protected readonly backupText = computed(() => {
    const at = this.backups.value()?.lastAt;
    return at ? timeAgo(at) : this.i18n.t('Never');
  });

  protected nodeClass(member: MemberView): string {
    return member.reachable ? member.role : 'down';
  }

  protected roleName(member: MemberView): string {
    return member.role === 'leader' ? 'Leader' : 'Voter';
  }
}
