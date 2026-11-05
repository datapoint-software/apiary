import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Button,
  EmptyState,
  I18n,
  Icon,
  PageHead,
  Status,
  TranslatePipe,
} from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { ProjectView, StackView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { StackActions } from './stack-actions';
import { declared, planCount } from './stack-text';

@Component({
  selector: 'ap-stack-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, Status, RouterLink, TranslatePipe],
  templateUrl: './stack-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackList {
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  private readonly actions = inject(StackActions);
  protected readonly auth = inject(Auth);
  protected readonly addIcon = Plus;
  protected readonly stacks = httpResource<StackView[]>(() => this.api.query('stacks.list'), {
    defaultValue: [],
  });
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), {
    defaultValue: [],
  });
  protected readonly isLoading = computed(
    () => this.stacks.isLoading() && this.stacks.value().length === 0,
  );
  protected readonly projectNames = computed(
    () => new Map(this.projects.value().map((p) => [p.id, p.name])),
  );
  protected readonly ago = timeAgo;

  protected declares(stack: StackView): string {
    return declared(stack, this.i18n).join(' · ') || this.i18n.t('Nothing');
  }

  protected changes(stack: StackView): string {
    const count = stack.lastApply ? planCount(stack.lastApply.plan) : 0;
    return count
      ? this.i18n.plural(count, '{count} change', '{count} changes')
      : this.i18n.t('No changes');
  }

  protected async add(): Promise<void> {
    const created = await this.actions.add();
    if (created) {
      await this.router.navigate(['/stacks', created.stack]);
    }
  }
}
