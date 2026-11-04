import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '@datapoint/apiary-ui';
import {
  Archive,
  Bot,
  Cable,
  CornerUpRight,
  PanelsTopLeft,
  Hexagon,
  KeyRound,
  LayoutDashboard,
  Route,
  ScrollText,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide';
import type { IconNode } from 'lucide';
import { Api } from '../api/api';
import { CertificateSummary, ProjectView, RouteView, UserView } from '../api/models';
import { Auth } from '../auth/auth';
import { routeLabel } from '../routes/route-label';
import { projectIcon } from './project-icons';

interface SearchItem {
  readonly icon: IconNode;
  readonly title: string;
  readonly sub: string;
  readonly link: string;
}

const pages: readonly (readonly [IconNode, string, string, boolean?])[] = [
  [LayoutDashboard, 'Overview', '/'],
  [Route, 'All routes', '/routes'],
  [Cable, 'Stream routes', '/streams'],
  [ShieldCheck, 'Certificates', '/certificates'],
  [CornerUpRight, 'Redirects', '/redirects'],
  [PanelsTopLeft, 'Visitor pages', '/visitor-pages'],
  [Hexagon, 'Replicas', '/replicas'],
  [Archive, 'Backups', '/backups', true],
  [KeyRound, 'Root key', '/root-key', true],
  [Users, 'Users', '/users', true],
  [Bot, 'Connected agents', '/agents'],
  [ScrollText, 'Audit log', '/audit'],
  [UserRound, 'Your account', '/account'],
];

const shortDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function certificateItems(certificate: CertificateSummary): SearchItem[] {
  const sub = certificate.notAfter ? `Certificate · expires ${shortDate.format(new Date(certificate.notAfter))}` : 'Certificate';
  return certificate.hosts.map((host) => ({ icon: ShieldCheck, title: host, sub, link: `/certificates/${certificate.id}` }));
}

@Component({
  selector: 'ap-search-box',
  imports: [Icon],
  host: { class: 'ap-search', role: 'search' },
  template: `
    <ap-icon [icon]="searchIcon" />
    <input
      #input
      class="ap-input"
      type="search"
      placeholder="Search routes, certificates, users"
      aria-label="Search"
      role="combobox"
      aria-controls="search-results"
      aria-autocomplete="list"
      autocomplete="off"
      spellcheck="false"
      [attr.aria-expanded]="open()"
      [attr.aria-activedescendant]="open() && results().length ? 'search-' + active() : null"
      [value]="query()"
      (input)="type(input.value)"
      (focus)="load()"
      (blur)="closeSoon()"
      (keydown)="key($event)"
    />
    <span class="ap-kbd" aria-hidden="true">{{ shortcut }}</span>
    @if (open()) {
      <div class="ap-menu ap-search-pop" id="search-results" role="listbox" aria-label="Search results">
        @for (item of results(); track item.link + item.title; let i = $index) {
          <div class="ap-option" role="option" [id]="'search-' + i" [attr.aria-selected]="i === active()" (mousedown)="pick(item, $event)">
            <ap-icon [icon]="item.icon" />
            <span>{{ item.title }}<small>{{ item.sub }}</small></span>
          </div>
        } @empty {
          <div class="ap-search-empty">Nothing matches “{{ query().trim() }}”.</div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBox {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly searchIcon = Search;
  protected readonly shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';
  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly open = computed(() => this.query().trim().length > 0 && this.listOpen());
  private readonly listOpen = signal(false);
  private readonly loaded = signal(false);
  private readonly projects = this.resource<ProjectView>('projects.list');
  private readonly routes = this.resource<RouteView>('routes.list');
  private readonly certificates = this.resource<CertificateSummary>('certificates.list');
  private readonly users = this.resource<UserView>('users.list', () => this.auth.canAdminister());

  private readonly index = computed<SearchItem[]>(() => {
    const admin = this.auth.canAdminister();
    const projectNames = new Map(this.projects.value().map((p) => [p.id, p.name]));
    return [
      ...pages.filter(([, , , adminOnly]) => admin || !adminOnly).map(([icon, title, link]) => ({ icon, title, sub: 'Page', link })),
      ...this.projects.value().map((p) => ({ icon: projectIcon(p.icon), title: p.name, sub: `Project · ${p.routeCount} routes`, link: `/projects/${p.id}` })),
      ...this.routes.value().map((r) => ({ icon: Route, title: routeLabel(r), sub: `Route · ${projectNames.get(r.projectId) ?? 'No project'}`, link: `/routes/${r.id}` })),
      ...this.certificates.value().flatMap(certificateItems),
      ...this.users.value().map((u) => ({ icon: UserRound, title: u.name, sub: `User · ${u.email}`, link: '/users' })),
    ];
  });

  protected readonly results = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.index()
      .filter((item) => `${item.title} ${item.sub}`.toLowerCase().includes(query))
      .slice(0, 8);
  });

  focus(): void {
    this.input().nativeElement.focus();
    this.input().nativeElement.select();
  }

  protected load(): void {
    this.loaded.set(true);
    this.listOpen.set(true);
  }

  protected type(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.load();
  }

  protected closeSoon(): void {
    setTimeout(() => this.listOpen.set(false), 150);
  }

  protected key(event: KeyboardEvent): void {
    const count = this.results().length;
    const moves: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };
    const move = moves[event.key];
    if (move !== undefined && this.open() && count) {
      event.preventDefault();
      this.active.update((i) => (i + move + count) % count);
    } else if (event.key === 'Enter' && this.open() && count) {
      event.preventDefault();
      this.go(this.results()[this.active()]);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.escape();
    }
  }

  protected pick(item: SearchItem, event: MouseEvent): void {
    event.preventDefault();
    this.go(item);
  }

  private escape(): void {
    if (this.open()) {
      this.listOpen.set(false);
      return;
    }
    this.query.set('');
    this.input().nativeElement.blur();
  }

  private go(item: SearchItem): void {
    this.query.set('');
    this.listOpen.set(false);
    this.input().nativeElement.blur();
    void this.router.navigateByUrl(item.link);
  }

  private resource<T>(action: string, allowed: () => boolean = () => true) {
    return httpResource<T[]>(() => (this.loaded() && allowed() ? this.api.query(action) : undefined), { defaultValue: [] });
  }
}
