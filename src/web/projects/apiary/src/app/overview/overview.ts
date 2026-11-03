import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Icon, PageHead } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';
import { projectIcon } from '../shell/project-icons';
import { Auth } from '../auth/auth';

@Component({
  selector: 'ap-overview',
  imports: [PageHead, RouterLink, Icon, Button],
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  protected readonly plus = Plus;
  protected readonly projectIcon = projectIcon;
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly routeCount = computed(() => this.projects.value().reduce((sum, p) => sum + p.routeCount, 0));
}
