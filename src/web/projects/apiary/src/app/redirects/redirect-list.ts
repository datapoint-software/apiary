import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, Confirmer, EmptyState, Icon, PageHead, Toaster } from '@datapoint/apiary-ui';
import { Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { ProjectView, RedirectView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { AddedRedirect, RedirectDialog } from './redirect-dialog';

const statusLabels: Record<number, string> = {
  301: 'Permanent',
  302: 'Temporary',
  307: 'Temporary, keeps method',
  308: 'Permanent, keeps method',
};

@Component({
  selector: 'ap-redirect-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button],
  templateUrl: './redirect-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, delete: Trash2 };
  protected readonly statusLabels = statusLabels;
  protected readonly redirects = httpResource<RedirectView[]>(() => this.api.query('redirects.list'), { defaultValue: [] });
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.redirects.isLoading() && this.redirects.value().length === 0);
  protected readonly projectNames = computed(() => new Map(this.projects.value().map((p) => [p.id, p.name])));

  protected async add(): Promise<void> {
    const added = await openDialog<AddedRedirect, null>(this.dialog, RedirectDialog, null);
    if (added) {
      this.toaster.show(`${added.from} now redirects to ${added.to}.`, { heading: 'Redirect added' });
    }
  }

  protected async delete(redirect: RedirectView): Promise<void> {
    const deleted = await this.confirmer.confirm({
      heading: `Delete the redirect from ${redirect.from}?`,
      text: 'Requests to it get a 404 at once. Browsers may remember a permanent redirect for a while.',
      confirm: 'Delete redirect',
      busy: 'Deleting…',
      action: () => this.api.send('redirects.delete', { id: redirect.id }),
    });
    if (deleted) {
      this.toaster.show(`The redirect from ${redirect.from} was deleted.`);
    }
  }
}
