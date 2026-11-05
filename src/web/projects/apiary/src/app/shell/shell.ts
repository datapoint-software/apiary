import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Banner, Button, I18n, Icon, Status, TranslatePipe } from '@datapoint/apiary-ui';
import {
  Archive,
  Bot,
  Cable,
  CornerUpRight,
  PanelsTopLeft,
  DoorOpen,
  FolderOpen,
  Hexagon,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Route,
  ScrollText,
  ShieldCheck,
  ShieldHalf,
  UserRound,
  Users,
} from 'lucide';
import { needsAttention } from '../certificates/certificate-status';
import { reloadEvery } from '../api/reload-every';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView, StackView, TrustedProxyView } from '../api/models';
import { Auth } from '../auth/auth';
import { ClusterStatus } from '../cluster/cluster-status';
import { isQuiet } from '../proxies/proxy-activity';
import { roleNames } from '../auth/roles';
import { DatapointLogo } from './datapoint-logo';
import { LanguageMenu } from './language-menu';
import { DisplayMenu } from './display-menu';
import { SearchBox } from './search-box';
import { NavGroup } from './nav-item';
import { projectIcon } from './project-icons';
import { readCollapsed, saveCollapsed } from './sidebar-preference';
import { sourceUrl, version } from '../version';

@Component({
  selector: 'ap-shell',
  host: { '(document:keydown.escape)': 'closeDrawer()', '(document:keydown)': 'shortcut($event)' },
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    Button,
    Banner,
    Status,
    DatapointLogo,
    LanguageMenu,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    SearchBox,
    DisplayMenu,
    TranslatePipe,
  ],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
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
  protected readonly sourceUrl = sourceUrl;
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
      : ['Expand sidebar (Ctrl or ⌘ + B)', 'Collapse sidebar (Ctrl or ⌘ + B)'];
    return this.i18n.t(labels[this.sidebarExpanded() ? 1 : 0]);
  });
  protected readonly panelIcon = PanelLeft;
  private readonly search = viewChild.required(SearchBox);
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), {
    defaultValue: [],
  });
  private readonly projectsRefresh = reloadEvery(this.projects);
  private readonly certificates = httpResource<CertificateSummary[]>(
    () => this.api.query('certificates.list'),
    { defaultValue: [] },
  );
  private readonly stacks = httpResource<StackView[]>(() => this.api.query('stacks.list'), { defaultValue: [] });
  private readonly proxies = httpResource<TrustedProxyView[]>(() => this.api.query('trusted-proxies.list'), { defaultValue: [] });

  protected readonly groups = computed<readonly NavGroup[]>(() => {
    const t = (text: string) => this.i18n.t(text);
    const projects = this.projects.value();
    const routes = projects.reduce((sum, p) => sum + p.routeCount, 0);
    return [
      { title: '', items: [{ icon: LayoutDashboard, label: t('Overview'), link: '/' }] },
      {
        title: t('Projects'),
        items: [
          ...projects.map((p) => ({
            icon: projectIcon(p.icon),
            label: p.name,
            link: `/projects/${p.id}`,
            count: p.routeCount || undefined,
            warn: p.routesDown + p.routesDegraded > 0,
          })),
          { icon: FolderOpen, label: t('All projects'), link: '/projects' },
        ],
      },
      {
        title: t('Traffic'),
        items: [
          { icon: Route, label: t('All routes'), link: '/routes', count: routes || undefined },
          { icon: Layers, label: t('Stacks'), link: '/stacks', count: this.stacks.value().length || undefined, warn: this.stacks.value().some((s) => !!s.failure) },
          { icon: Cable, label: t('Stream routes'), link: '/streams' },
          {
            icon: ShieldCheck,
            label: t('Certificates'),
            link: '/certificates',
            warn: this.certificates.value().some(needsAttention),
          },
          { icon: CornerUpRight, label: t('Redirects'), link: '/redirects' },
          { icon: PanelsTopLeft, label: t('Visitor pages'), link: '/visitor-pages' },
        ],
      },
      {
        title: t('Access'),
        items: [
          ...(this.auth.canAdminister()
            ? [
                { icon: Users, label: t('Users'), link: '/users' },
                { icon: DoorOpen, label: t('Single sign-on'), link: '/single-sign-on' },
                { icon: KeyRound, label: t('Pipeline tokens'), link: '/pipeline-tokens' },
              ]
            : []),
          { icon: Bot, label: t('Connected agents'), link: '/agents' },
          { icon: ScrollText, label: t('Audit log'), link: '/audit' },
        ],
      },
      {
        title: t('Cluster'),
        items: [
          {
            icon: Hexagon,
            label: t('Replicas'),
            link: '/replicas',
            warn: this.cluster.reachable() < this.cluster.voters().length,
          },
          {
            icon: ShieldHalf,
            label: t('Trusted proxies'),
            link: '/trusted-proxies',
            count: this.proxies.value().length || undefined,
            warn: this.proxies.value().some((p) => isQuiet(p)),
          },
          ...(this.auth.canAdminister()
            ? [
                { icon: Archive, label: t('Backups'), link: '/backups' },
                { icon: KeyRound, label: t('Root key'), link: '/root-key' },
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

  protected shortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'k') {
      event.preventDefault();
      this.search().focus();
    } else if (key === 'b' && !this.isPhone()) {
      event.preventDefault();
      this.toggleSidebar();
    }
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
