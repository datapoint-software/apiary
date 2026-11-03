import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button, Icon } from '@datapoint/apiary-ui';
import { LayoutDashboard, PanelLeft, Route } from 'lucide';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';
import { DatapointLogo } from './datapoint-logo';
import { NavGroup } from './nav-item';
import { projectIcon } from './project-icons';
import { readCollapsed, saveCollapsed } from './sidebar-preference';

@Component({
  selector: 'ap-shell',
  host: { '(document:keydown.escape)': 'closeDrawer()' },
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Button, DatapointLogo],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly api = inject(Api);
  protected readonly version = '0.1.0';
  protected readonly collapsed = signal(readCollapsed());
  protected readonly drawerOpen = signal(false);
  private readonly phone = matchMedia('(max-width: 639px)');
  protected readonly isPhone = signal(this.phone.matches);
  protected readonly sidebarExpanded = computed(() => (this.isPhone() ? this.drawerOpen() : !this.collapsed()));
  protected readonly sidebarLabel = computed(() => {
    const labels = this.isPhone() ? ['Open menu', 'Close menu'] : ['Expand sidebar', 'Collapse sidebar'];
    return labels[this.sidebarExpanded() ? 1 : 0];
  });
  protected readonly panelIcon = PanelLeft;
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });

  protected readonly groups = computed<readonly NavGroup[]>(() => {
    const projects = this.projects.value();
    const routes = projects.reduce((sum, p) => sum + p.routeCount, 0);
    return [
      { title: '', items: [{ icon: LayoutDashboard, label: 'Overview', link: '/' }] },
      {
        title: 'Projects',
        items: projects.map((p) => ({
          icon: projectIcon(p.icon),
          label: p.name,
          link: '/routes',
          query: { project: p.id },
          count: p.routeCount || undefined,
        })),
      },
      { title: 'Traffic', items: [{ icon: Route, label: 'All routes', link: '/routes', count: routes || undefined }] },
    ];
  });

  constructor() {
    const onChange = (event: MediaQueryListEvent) => this.isPhone.set(event.matches);
    this.phone.addEventListener('change', onChange);
    const navigation = inject(Router).events.subscribe((event) => {
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

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
