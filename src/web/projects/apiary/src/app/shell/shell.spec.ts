import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ClusterView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { Answers, answerAll } from '../testing/answer-all';
import { nextRequest } from '../testing/backend';
import {
  aCertificate,
  aCluster,
  aDnsProvider,
  aMember,
  aProject,
  aSignedInUser,
  aStack,
  aTrustedProxy,
} from '../testing/builders';
import { byLabel, byRole, menuItem, menuItemNames, settle, textOf } from '../testing/dom';
import { Shell } from './shell';

class FakeMediaQuery {
  private listener?: (event: { matches: boolean }) => void;

  constructor(public matches: boolean) {}

  addEventListener(event: string, listener: (event: { matches: boolean }) => void): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = undefined;
  }

  change(matches: boolean): void {
    this.matches = matches;
    this.listener?.({ matches });
  }
}

const quiet: Answers = {
  '/api/projects/list': [aProject({ id: 'project-1', name: 'Shop', routeCount: 2 })],
  '/api/certificates/list': [],
  '/api/stacks/list': [],
  '/api/trusted-proxies/list': [],
  '/api/dns-providers/list': [],
  '/api/cluster/status': aCluster(),
};

interface Rendered {
  readonly fixture: ComponentFixture<Shell>;
  readonly backend: HttpTestingController;
  readonly media: FakeMediaQuery;
}

interface Options {
  readonly role?: Role;
  readonly phone?: boolean;
  readonly answers?: Partial<Record<keyof typeof quiet, unknown>>;
}

async function render({
  role = 'administrator',
  phone = false,
  answers = {},
}: Options = {}): Promise<Rendered> {
  localStorage.clear();
  const media = new FakeMediaQuery(phone);
  vi.stubGlobal('matchMedia', () => media);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role, name: 'Ana Maria Silva' }));
  const fixture = TestBed.createComponent(Shell);
  document.body.appendChild(fixture.nativeElement);
  const backend = TestBed.inject(HttpTestingController);
  await answerAll(fixture, backend, { ...quiet, ...answers });
  return { fixture, backend, media };
}

function navLinks(fixture: ComponentFixture<Shell>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ap-nav-item')].map(
    (a) => a.getAttribute('data-label') ?? '',
  );
}

function shell(fixture: ComponentFixture<Shell>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ap-shell') as HTMLElement;
}

function sidebarButton(fixture: ComponentFixture<Shell>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    '.ap-sidebar-btn',
  ) as HTMLButtonElement;
}

async function press(fixture: ComponentFixture<Shell>, key: string, ctrlKey = true): Promise<void> {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true }));
  await settle(fixture);
}

describe('Shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.remove());
  });

  it('lists the projects and every page an administrator can open', async () => {
    const { fixture } = await render();

    expect(navLinks(fixture)).toEqual([
      'Overview',
      'Shop',
      'All projects',
      'All routes',
      'Stacks',
      'Stream routes',
      'Certificates',
      'DNS providers',
      'Redirects',
      'Visitor pages',
      'Users',
      'Single sign-on',
      'Pipeline tokens',
      'Connected agents',
      'Audit log',
      'Replicas',
      'Trusted proxies',
      'Backups',
      'Root key',
    ]);
  });

  it('leaves out the administrator’s pages for an operator', async () => {
    const { fixture } = await render({ role: 'operator' });

    expect(navLinks(fixture)).not.toContain('Users');
    expect(navLinks(fixture)).not.toContain('Pipeline tokens');
  });

  it('counts the routes of each project and in all', async () => {
    const { fixture } = await render({
      answers: {
        '/api/projects/list': [
          aProject({ id: 'p-1', name: 'Shop', routeCount: 2 }),
          aProject({ id: 'p-2', name: 'Blog', routeCount: 3 }),
        ],
      },
    });

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ap-count')].map((c) =>
        c.textContent?.trim(),
      ),
    ).toEqual([', 2', ', 3', ', 5']);
  });

  it('flags a project with routes in trouble', async () => {
    const { fixture } = await render({
      answers: { '/api/projects/list': [aProject({ name: 'Shop', routesDown: 1 })] },
    });

    expect(textOf(fixture)).toContain('Shop, needs attention');
  });

  it('flags certificates that need attention', async () => {
    const { fixture } = await render({
      answers: { '/api/certificates/list': [aCertificate({ status: 'failing' })] },
    });

    expect(textOf(fixture)).toContain('Certificates, needs attention');
  });

  it('flags a stack whose last apply failed', async () => {
    const { fixture } = await render({
      answers: {
        '/api/stacks/list': [
          aStack({
            failure: { at: '2026-11-04T09:00:00Z', code: 'route.hostInUse', token: 'shop-deploy' },
          }),
        ],
      },
    });

    expect(textOf(fixture)).toContain('Stacks, needs attention');
  });

  it('counts the trusted proxies', async () => {
    const { fixture } = await render({
      answers: { '/api/trusted-proxies/list': [aTrustedProxy({ lastRequestAt: new Date().toISOString() })] },
    });

    expect(textOf(fixture)).toContain('Trusted proxies, 1');
  });

  it('counts the DNS providers', async () => {
    const { fixture } = await render({ answers: { '/api/dns-providers/list': [aDnsProvider()] } });

    expect(textOf(fixture)).toContain('DNS providers, 1');
  });

  it('flags a DNS provider whose last test failed', async () => {
    const { fixture } = await render({
      answers: { '/api/dns-providers/list': [aDnsProvider({ lastTest: { at: '2026-11-04T10:00:00Z', succeeded: false, code: 'dns.unauthorized' } })] },
    });

    expect(textOf(fixture)).toContain('DNS providers, needs attention');
  });

  it('flags a trusted proxy with no request for a day', async () => {
    const { fixture } = await render({
      answers: { '/api/trusted-proxies/list': [aTrustedProxy({ lastRequestAt: null })] },
    });

    expect(textOf(fixture)).toContain('Trusted proxies, needs attention');
  });

  it.each([
    [aCluster(), 'ok', '1 of 1 replicas, changes are accepted'],
    [
      aCluster({ members: [aMember({ id: 'a' }), aMember({ id: 'b', reachable: false })] }),
      'warn',
      '1 of 2 replicas, changes are accepted',
    ],
    [
      aCluster({ writable: false, members: [aMember({ reachable: false })] }),
      'critical',
      '0 of 1 replicas, changes are paused',
    ],
  ] as [ClusterView, string, string][])(
    'shows how many replicas answer, in %#',
    async (cluster, tone, text) => {
      const { fixture } = await render({ answers: { '/api/cluster/status': cluster } });
      const status = (fixture.nativeElement as HTMLElement).querySelector(
        '.ap-top-end .ap-status',
      ) as HTMLElement;

      expect([status.classList.contains(`ap-status-${tone}`), status.textContent?.trim()]).toEqual([
        true,
        text,
      ]);
    },
  );

  it('warns that changes are paused', async () => {
    const { fixture } = await render({
      answers: { '/api/cluster/status': aCluster({ writable: false }) },
    });

    expect(textOf(fixture)).toContain('Changes are paused');
  });

  it('shows no replica count outside Swarm', async () => {
    const { fixture } = await render({
      answers: { '/api/cluster/status': aCluster({ mode: 'Standalone' }) },
    });

    expect(textOf(fixture)).not.toContain('replicas, changes');
  });

  it('collapses the sidebar and remembers it', async () => {
    const { fixture } = await render();

    sidebarButton(fixture).click();
    await settle(fixture);

    expect([
      shell(fixture).getAttribute('data-collapsed'),
      localStorage.getItem('apiary.sidebarCollapsed'),
    ]).toEqual(['true', 'true']);
  });

  it('labels the sidebar button by what it does next', async () => {
    const { fixture } = await render();

    sidebarButton(fixture).click();
    await settle(fixture);

    expect(sidebarButton(fixture).getAttribute('aria-label')).toBe(
      'Expand sidebar (Ctrl or ⌘ + B)',
    );
  });

  it('toggles the sidebar with Ctrl+B', async () => {
    const { fixture } = await render();

    await press(fixture, 'b');

    expect(shell(fixture).getAttribute('data-collapsed')).toBe('true');
  });

  it('ignores B without Ctrl or ⌘', async () => {
    const { fixture } = await render();

    await press(fixture, 'b', false);

    expect(shell(fixture).getAttribute('data-collapsed')).toBe('false');
  });

  it('focuses the search box with Ctrl+K', async () => {
    const { fixture } = await render();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );

    expect(document.activeElement).toBe(byLabel(fixture, 'Search'));
  });

  it('opens the menu as a drawer on a phone', async () => {
    const { fixture } = await render({ phone: true });

    sidebarButton(fixture).click();
    await settle(fixture);

    expect([
      shell(fixture).getAttribute('data-drawer'),
      sidebarButton(fixture).getAttribute('aria-label'),
    ]).toEqual(['open', 'Close menu']);
  });

  it('closes the drawer on Escape', async () => {
    const { fixture } = await render({ phone: true });
    sidebarButton(fixture).click();
    await settle(fixture);

    await press(fixture, 'Escape', false);

    expect(shell(fixture).getAttribute('data-drawer')).toBe('closed');
  });

  it('closes the drawer once a page opens', async () => {
    const { fixture } = await render({ phone: true });
    sidebarButton(fixture).click();
    await settle(fixture);

    await TestBed.inject(Router).navigateByUrl('/routes');
    await settle(fixture);

    expect(shell(fixture).getAttribute('data-drawer')).toBe('closed');
  });

  it('switches to the drawer when the window becomes narrow', async () => {
    const { fixture, media } = await render();

    media.change(true);
    await settle(fixture);

    expect(sidebarButton(fixture).getAttribute('aria-label')).toBe('Open menu');
  });

  it('shows the person’s initials and their account menu', async () => {
    const { fixture } = await render();

    byRole(fixture, 'button', 'Account: Ana Maria Silva, AM').click();
    await settle(fixture);

    expect(menuItemNames()).toEqual(['Your account', 'Security', 'Active sessions', 'Sign out']);
  });

  it('signs out and goes to the sign-in page', async () => {
    const { fixture, backend } = await render();
    byRole(fixture, 'button', 'Account: Ana Maria Silva, AM').click();
    await settle(fixture);

    menuItem('Sign out').click();
    (await nextRequest(backend, '/api/auth/sign-out')).flush(null);

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/sign-in'));
  });
});
