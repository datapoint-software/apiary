import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, Icon, PageHead } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { reloadEvery } from '../api/reload-every';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { daysLeft, needsAttention } from '../certificates/certificate-status';
import { ClusterStatus } from '../cluster/cluster-status';
import { WriteLock } from '../cluster/write-lock';
import { ProjectCards } from '../projects/project-cards';
import { CertificateMeters } from './certificate-meters';
import { RecentActivity } from './recent-activity';
import { ReplicaPanel } from './replica-panel';

function greeting(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

@Component({
  selector: 'ap-overview',
  imports: [WriteLock, PageHead, RouterLink, Icon, Button, Banner, ProjectCards, ReplicaPanel, CertificateMeters, RecentActivity],
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);
  protected readonly cluster = inject(ClusterStatus);
  protected readonly plus = Plus;
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly projectsRefresh = reloadEvery(this.projects);
  private readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), {
    defaultValue: [],
  });
  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly routesRefresh = reloadEvery(this.routes);
  protected readonly down = computed(() => this.routes.value().filter((r) => !r.disabled && r.health === 'down').slice(0, 2));
  protected readonly heading = computed(() => {
    const first = this.auth.user()?.name.split(/\s+/)[0];
    const hello = greeting(new Date().getHours());
    return first ? `${hello}, ${first}` : hello;
  });
  protected readonly firstProjects = computed(() => this.projects.value().slice(0, 3));
  protected readonly failing = computed(() => this.certificates.value().filter(needsAttention).slice(0, 2));
  protected readonly unreachable = computed(() => this.cluster.voters().length - this.cluster.reachable());
  protected readonly daysLeft = daysLeft;
}
