import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Banner, Button, Confirmer, EmptyState, PageHead, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { AgentView } from '../api/models';
import { timeAgo, utcDateTime } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { CopyText } from '../auth/copy-text';
import { roleNames } from '../auth/roles';
import { WriteLock } from '../cluster/write-lock';
import { TrustedOriginsPanel } from './trusted-origins-panel';

@Component({
  selector: 'ap-agent-list',
  imports: [WriteLock, PageHead, Banner, Button, EmptyState, CopyText, TrustedOriginsPanel],
  templateUrl: './agent-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentList {
  private readonly api = inject(Api);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  protected readonly auth = inject(Auth);
  protected readonly agents = httpResource<AgentView[]>(() => this.api.query('agents.list'), { defaultValue: [] });
  protected readonly endpoint = `${location.origin}/mcp`;
  protected readonly command = `claude mcp add --transport http apiary ${this.endpoint}`;
  protected readonly role = computed(() => {
    const role = this.auth.user()?.role;
    return role ? roleNames[role] : '';
  });
  protected readonly timeAgo = timeAgo;
  protected readonly utcDateTime = utcDateTime;

  protected async disconnect(agent: AgentView): Promise<void> {
    const done = await this.confirmer.confirm({
      heading: `Disconnect ${agent.name}?`,
      text: `It loses access at once, including any task it’s running. ${agent.mine ? 'You' : agent.user} can connect it again.`,
      confirm: 'Disconnect',
      busy: 'Disconnecting…',
      action: () => this.api.send('agents.disconnect', { id: agent.id }),
    });
    if (done) {
      this.toaster.show(`${agent.name} can no longer reach Apiary.`);
    }
  }
}
