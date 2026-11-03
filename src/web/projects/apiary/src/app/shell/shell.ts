import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Banner, Button, Icon, Status } from '@datapoint/apiary-ui';
import {
  Archive,
  Bot,
  CornerUpRight,
  DoorOpen,
  FolderOpen,
  Hexagon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Route,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide';
import { needsAttention } from '../certificates/certificate-status';
import { reloadEvery } from '../api/reload-every';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView } from '../api/models';
import { Auth } from '../auth/auth';
import { ClusterStatus } from '../cluster/cluster-status';
import { roleNames } from '../auth/roles';
import { DatapointLogo } from './datapoint-logo';
import { NavGroup } from './nav-item';
import { projectIcon } from './project-icons';
import { readCollapsed, saveCollapsed } from './sidebar-preference';
import { version } from '../version';

@Component({
  selector: 'ap-shell',
  host: { '(document:keydown.escape)': 'closeDrawer()' },
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    Button,
    Banner,
    Status,
    DatapointLogo,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
  ],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);
  protected readonly cluster = inject(ClusterStatus);
  protected readonly roleNames = roleNames;
  protected readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );
  protected readonly accountIcons = {
    profile: UserRound,
    security: ShieldCheck,
    sessions: MonitorSmartphone,
    signOut: LogOut,
  };
  protected readonly version = version;
  protected readonly collapsed = signal(readCollapsed());
  protected readonly drawerOpen = signal(false);
  private readonly phone = matchMedia('(max-width: 639px)');
  protected readonly isPhone = signal(this.phone.matches);
  protected readonly sidebarExpanded = computed(() =>
    this.isPhone() ? this.drawerOpen() : !this.collapsed(),
  );
  protected readonly sidebarLabel = computed(() => {
    const labels = this.isPhone()
      ? ['Open menu', 'Close menu']
      : ['Expand sidebar', 'Collapse sidebar'];
    return labels[this.sidebarExpanded() ? 1 : 0];
  });
  protected readonly panelIcon = PanelLeft;
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), {
    defaultValue: [],
  });
  private readonly projectsRefresh = reloadEvery(this.projects);
  private readonly certificates = httpResource<CertificateSummary[]>(
    () => this.api.query('certificates.list'),
    { defaultValue: [] },
  );

  protected readonly groups = computed<readonly NavGroup[]>(() => {
    const projects = this.projects.value();
    const routes = projects.reduce((sum, p) => sum + p.routeCount, 0);
    return [
      { title: '', items: [{ icon: LayoutDashboard, label: 'Overview', link: '/' }] },
      {
        title: 'Projects',
        items: [
          ...projects.map((p) => ({
            icon: projectIcon(p.icon),
            label: p.name,
            link: `/projects/${p.id}`,
            count: p.routeCount || undefined,
            warn: p.routesDown + p.routesDegraded > 0,
          })),
          { icon: FolderOpen, label: 'All projects', link: '/projects' },
        ],
      },
      {
        title: 'Traffic',
        items: [
          { icon: Route, label: 'All routes', link: '/routes', count: routes || undefined },
          {
            icon: ShieldCheck,
            label: 'Certificates',
            link: '/certificates',
            warn: this.certificates.value().some(needsAttention),
          },
          { icon: CornerUpRight, label: 'Redirects', link: '/redirects' },
        ],
      },
      {
        title: 'Access',
        items: [
          ...(this.auth.canAdminister()
            ? [
                { icon: Users, label: 'Users', link: '/users' },
                { icon: DoorOpen, label: 'Single sign-on', link: '/single-sign-on' },
              ]
            : []),
          { icon: Bot, label: 'Connected agents', link: '/agents' },
          { icon: ScrollText, label: 'Audit log', link: '/audit' },
        ],
      },
      {
        title: 'Cluster',
        items: [
          {
            icon: Hexagon,
            label: 'Replicas',
            link: '/replicas',
            warn: this.cluster.reachable() < this.cluster.voters().length,
          },
          ...(this.auth.canAdminister()
            ? [
                { icon: Archive, label: 'Backups', link: '/backups' },
                { icon: KeyRound, label: 'Root key', link: '/root-key' },
              ]
            : []),
        ],
      },
    ];
  });

  constructor() {
    const onChange = (event: MediaQueryListEvent) => this.isPhone.set(event.matches);
    this.phone.addEventListener('change', onChange);
    const navigation = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.drawerOpen.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.phone.removeEventListener('change', onChange);
      navigation.unsubscribe();
    });
  }

  protected toggleSidebar(): void {
    if (this.isPhone()) {
      this.drawerOpen.update((open) => !open);
      return;
    }
    this.collapsed.update((c) => !c);
    saveCollapsed(this.collapsed());
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/sign-in']);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
