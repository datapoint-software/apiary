import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Button, Confirmer, I18n, Icon, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { RedirectView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { StackTag } from '../stacks/stack-tag';
import { deleteRedirect } from './delete-redirect';
import { AddedRedirect, RedirectDialog, RedirectHost } from './redirect-dialog';
import { redirectLabel, wholeHost } from './redirect-rules';
import { RedirectTarget, statusLabels } from './redirect-target';

@Component({
  selector: 'ap-path-redirects-section',
  imports: [WriteLock, Button, Icon, StackTag, RedirectTarget, TranslatePipe],
  templateUrl: './path-redirects-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathRedirectsSection {
  readonly route = input<RouteView>();
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, delete: Trash2 };
  protected readonly statusLabels = statusLabels;
  private readonly redirects = httpResource<RedirectView[]>(() => (this.route() ? this.api.query('redirects.list') : undefined), { defaultValue: [] });
  protected readonly onHost = computed(() => this.redirects.value().filter((r) => r.from === this.route()?.host && r.path !== wholeHost));
  protected readonly label = redirectLabel;

  protected async add(route: RouteView): Promise<void> {
    const added = await openDialog<AddedRedirect, RedirectHost>(this.dialog, RedirectDialog, { host: route.host, projectId: route.projectId });
    if (added) {
      this.redirects.reload();
      this.toaster.show(this.i18n.t('{from} now redirects to {to}.', { from: added.from, to: added.to }), { heading: this.i18n.t('Redirect added') });
    }
  }

  protected async delete(redirect: RedirectView): Promise<void> {
    if (await deleteRedirect(redirect, { api: this.api, confirmer: this.confirmer, toaster: this.toaster, i18n: this.i18n })) {
      this.redirects.reload();
    }
  }
}
