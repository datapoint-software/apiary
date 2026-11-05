import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, Confirmer, EmptyState, I18n, Icon, PageHead, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { ProjectView, RedirectView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { StackTag } from '../stacks/stack-tag';
import { openDialog } from '../shell/open-dialog';
import { AddedRedirect, RedirectDialog } from './redirect-dialog';
import { deleteRedirect } from './delete-redirect';
import { redirectLabel } from './redirect-rules';
import { RedirectTarget, statusLabels } from './redirect-target';

@Component({
  selector: 'ap-redirect-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, StackTag, RedirectTarget, TranslatePipe],
  templateUrl: './redirect-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, delete: Trash2 };
  protected readonly statusLabels = statusLabels;
  protected readonly redirects = httpResource<RedirectView[]>(() => this.api.query('redirects.list'), { defaultValue: [] });
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.redirects.isLoading() && this.redirects.value().length === 0);
  protected readonly projectNames = computed(() => new Map(this.projects.value().map((p) => [p.id, p.name])));
  protected readonly label = redirectLabel;

  protected async add(): Promise<void> {
    const added = await openDialog<AddedRedirect, null>(this.dialog, RedirectDialog, null);
    if (added) {
      this.toaster.show(this.i18n.t('{from} now redirects to {to}.', { from: added.from, to: added.to }), { heading: this.i18n.t('Redirect added') });
    }
  }

  protected async delete(redirect: RedirectView): Promise<void> {
    await deleteRedirect(redirect, { api: this.api, confirmer: this.confirmer, toaster: this.toaster, i18n: this.i18n });
  }
}
