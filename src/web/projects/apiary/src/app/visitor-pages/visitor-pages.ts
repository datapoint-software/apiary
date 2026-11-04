import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, Confirmer, EmptyState, I18n, Icon, PageHead, TextParams, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Pencil, Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { BrandView, BrandsView, ProjectView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { BrandDialog, BrandDialogData } from './brand-dialog';
import { BrandSummary } from './brand-summary';

@Component({
  selector: 'ap-visitor-pages',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, BrandSummary, TranslatePipe],
  templateUrl: './visitor-pages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitorPages {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, edit: Pencil, remove: Trash2 };
  protected readonly timeAgo = timeAgo;
  protected readonly brands = httpResource<BrandsView>(() => this.api.query('brands.list'));
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly unbranded = computed(() => {
    const branded = new Set(this.brands.value()?.projects.map((p) => p.projectId));
    return this.projects.value().filter((p) => !branded.has(p.id));
  });
  protected readonly canAddAnother = computed(
    () => this.auth.canOperate() && this.unbranded().length > 0 && (this.brands.value()?.projects.length ?? 0) > 0,
  );

  protected async edit(projectId: string | null, brand: BrandView | undefined, heading: string, params: TextParams = {}): Promise<void> {
    await this.open({ projectId, brand, heading: this.i18n.t(heading, params), choices: [] });
  }

  protected async add(): Promise<void> {
    await this.open({ projectId: null, heading: this.i18n.t('Give a project its own brand'), choices: this.unbranded() });
  }

  protected async remove(projectId: string | null, projectName?: string): Promise<void> {
    const removed = await this.confirmer.confirm({
      heading: projectName ? this.i18n.t('Remove the brand of {project}?', { project: projectName }) : this.i18n.t('Remove the cluster brand?'),
      text: this.i18n.t(
        projectName ? 'Its visitor pages use the cluster brand again.' : 'Visitor pages without a project brand show only their message and “Powered by Apiary”.',
      ),
      confirm: this.i18n.t('Remove brand'),
      busy: this.i18n.t('Removing…'),
      action: () => this.api.send('brands.remove', { projectId }),
    });
    if (removed) {
      this.toaster.show(
        projectName ? this.i18n.t('{project} uses the cluster brand again.', { project: projectName }) : this.i18n.t('The cluster brand was removed.'),
      );
    }
  }

  private async open(data: BrandDialogData): Promise<void> {
    const saved = await openDialog<string, BrandDialogData>(this.dialog, BrandDialog, data);
    if (saved) {
      this.toaster.show(saved, { heading: this.i18n.t('Brand saved') });
    }
  }
}
