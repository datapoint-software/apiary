import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, EmptyState, Icon, PageHead, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { ProjectActions } from './project-actions';
import { ProjectCards } from './project-cards';

@Component({
  selector: 'ap-project-list',
  imports: [WriteLock, PageHead, EmptyState, Icon, Button, ProjectCards, TranslatePipe],
  template: `
    <ap-page-head [heading]="'Projects' | t">
      <span pageSub>{{ 'Projects group routes and certificates so they’re easier to find. They don’t change who can see or edit them.' | t }}</span>
      @if (auth.canOperate()) {
        <button apWrite pageActions apButton="primary" type="button" (click)="actions.create()"><ap-icon [icon]="plus" />{{ 'New project' | t }}</button>
      }
    </ap-page-head>
    @if (isLoading()) {
      <div class="ap-panel" style="padding: 24px" aria-busy="true" [attr.aria-label]="'Loading' | t">
        <span class="ap-skel" style="width: 60%; height: 14px"></span>
      </div>
    } @else if (projects.value().length === 0) {
      <section class="ap-panel">
        <ap-empty-state [heading]="'No projects yet' | t">{{ 'Create a project for each site, team or customer, then add routes to it.' | t }}</ap-empty-state>
      </section>
    } @else {
      <ap-project-cards [projects]="projects.value()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  protected readonly actions = inject(ProjectActions);
  protected readonly plus = Plus;
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.projects.isLoading() && this.projects.value().length === 0);
}
