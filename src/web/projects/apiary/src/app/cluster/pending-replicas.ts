import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, ErrorMessages, I18n, Toaster, TranslatePipe, isApiProblem } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { PendingReplica } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { ClusterStatus } from './cluster-status';
import { WriteLock } from './write-lock';

@Component({
  selector: 'ap-pending-replicas',
  imports: [Button, WriteLock, TranslatePipe],
  templateUrl: './pending-replicas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingReplicas {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly cluster = inject(ClusterStatus);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly timeAgo = timeAgo;
  protected readonly pending = computed(() => this.cluster.view()?.pending ?? []);
  protected readonly approving = signal<string | null>(null);

  protected async approve(replica: PendingReplica): Promise<void> {
    this.approving.set(replica.id);
    try {
      await this.api.send('cluster.approve-replica', { id: replica.id });
      this.toaster.show(
        this.i18n.t(
          'The replica on {node} joins in a few seconds, then catches up and starts serving traffic.',
          { node: replica.node },
        ),
        {
          heading: this.i18n.t('Replica approved'),
        },
      );
    } catch (error) {
      this.toaster.show(
        this.messages.describe(isApiProblem(error) ? error.code : 'network.offline'),
        { tone: 'error', heading: this.i18n.t('Couldn’t approve') },
      );
    } finally {
      this.approving.set(null);
      this.cluster.reload();
    }
  }
}
