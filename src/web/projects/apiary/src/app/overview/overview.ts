import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, I18n, Icon, PageHead, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { reloadEvery } from '../api/reload-every';
import { Api } from '../api/api';
import { ActivityRange, CertificateSummary, ProjectView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { daysLeft, needsAttention } from '../certificates/certificate-status';
import { ClusterStatus } from '../cluster/cluster-status';
import { WriteLock } from '../cluster/write-lock';
import { ProjectCards } from '../projects/project-cards';
import { ActivityStats } from './activity-stats';
import { CertificateMeters } from './certificate-meters';
import { GetStarted } from './get-started';
import { RecentActivity } from './recent-activity';
import { ReplicaPanel } from './replica-panel';

function greeting(hour: number): readonly [string, string] {
  if (hour < 12) {
    return ['Good morning', 'Good morning, {name}'];
  }
  return hour < 18 ? ['Good afternoon', 'Good afternoon, {name}'] : ['Good evening', 'Good evening, {name}'];
}

@Component({
  selector: 'ap-overview',
  imports: [WriteLock, PageHead, RouterLink, Icon, Button, Banner, ProjectCards, GetStarted, ActivityStats, ReplicaPanel, CertificateMeters, RecentActivity, TranslatePipe],
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly cluster = inject(ClusterStatus);
  protected readonly plus = Plus;
  protected readonly ranges: readonly [ActivityRange, string][] = [
    ['hour', '1 h'],
    ['day', '24 h'],
  ];
  protected readonly range = signal<ActivityRange>('day');
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly projectsRefresh = reloadEvery(this.projects);
  private readonly certificates = httpResource<CertificateSummary[]>(() => this.api.query('certificates.list'), {
    defaultValue: [],
  });
  private readonly routes = httpResource<RouteView[]>(() => this.api.query('routes.list'), { defaultValue: [] });
  private readonly routesRefresh = reloadEvery(this.routes);
  protected readonly firstRun = computed(
    () => this.auth.canAdminister() && !['idle', 'loading', 'error'].includes(this.routes.status()) && this.routes.value().length === 0,
  );
  protected readonly down = computed(() => this.routes.value().filter((r) => !r.disabled && r.health === 'down').slice(0, 2));
  protected readonly heading = computed(() => {
    const name = this.auth.user()?.name.split(/\s+/)[0];
    const [alone, named] = greeting(new Date().getHours());
    return name ? this.i18n.t(named, { name }) : this.i18n.t(alone);
  });
  protected readonly firstProjects = computed(() => this.projects.value().slice(0, 3));
  protected readonly failing = computed(() => this.certificates.value().filter(needsAttention).slice(0, 2));
  protected readonly unreachable = computed(() => this.cluster.voters().length - this.cluster.reachable());
  protected readonly unreachableHeading = computed(() =>
    this.i18n.plural(this.unreachable(), '{count} replica is unreachable', '{count} replicas are unreachable'),
  );

  protected expiry(certificate: CertificateSummary): string {
    return certificate.notAfter
      ? this.i18n.plural(daysLeft(certificate), 'It expires in {count} day.', 'It expires in {count} days.')
      : this.i18n.t('It hasn’t been issued yet.');
  }
}
