import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Route, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Profile } from './account/profile';
import { Security } from './account/security';
import { Sessions } from './account/sessions';
import { AgentList } from './agents/agent-list';
import { ConnectAgent } from './agents/connect-agent';
import { AuditLog } from './audit/audit-log';
import { AcceptInvite } from './auth/accept-invite';
import { Setup } from './auth/setup';
import { SignIn } from './auth/sign-in';
import { BackupPage } from './backups/backup-page';
import { CertificateDetails } from './certificates/certificate-details';
import { CertificateList } from './certificates/certificate-list';
import { ReplicaList } from './cluster/replica-list';
import { DnsProviderList } from './dns-providers/dns-provider-list';
import { RootKeyPage } from './keys/root-key-page';
import { Overview } from './overview/overview';
import { ProjectList } from './projects/project-list';
import { ProjectPage } from './projects/project-page';
import { RedirectList } from './redirects/redirect-list';
import { RouteEditor } from './routes/route-editor';
import { RouteList } from './routes/route-list';
import { NotFound } from './shell/not-found';
import { SsoSettings } from './sso/sso-settings';
import { StreamList } from './streams/stream-list';
import { UserList } from './users/user-list';
import { VisitorPages } from './visitor-pages/visitor-pages';
import { routes } from './app.routes';
import { nextRequest } from './testing/backend';
import { aProblem } from './testing/builders';

const sessionEnded = { status: 401, statusText: 'Unauthorized' };

function routeAt(path: string): Route {
  const shell = routes.find((r) => r.path === '' && r.children) as Route;
  return [...(shell.children ?? []), ...routes].find((r) => r.path === path) as Route;
}

async function componentAt(path: string): Promise<unknown> {
  return routeAt(path).loadComponent?.();
}

async function visitSignedOut(url: string, setupOpen: boolean): Promise<string> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
  });
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  const navigation = harness.navigateByUrl(url);
  (await nextRequest(backend, '/api/auth/me')).flush(aProblem(401, 'auth.required'), sessionEnded);
  (await nextRequest(backend, '/api/setup/status')).flush({ open: setupOpen });
  await navigation;
  return TestBed.inject(Router).url;
}

describe('app routes', () => {
  it('sends a signed-out visitor to sign in before showing a page', async () => {
    expect(await visitSignedOut('/certificates', false)).toBe('/sign-in?next=%2Fcertificates');
  });

  it('sends the first visitor of a new cluster to setup', async () => {
    expect(await visitSignedOut('/', true)).toBe('/setup');
  });

  it('sends a signed-out visitor to sign in before connecting an agent', async () => {
    expect(await visitSignedOut('/connect', false)).toBe('/sign-in?next=%2Fconnect');
  });

  it.each([
    ['sign-in', SignIn],
    ['setup', Setup],
    ['invite/:token', AcceptInvite],
    ['connect', ConnectAgent],
    ['', Overview],
    ['routes', RouteList],
    ['projects', ProjectList],
    ['projects/:id', ProjectPage],
    ['routes/new', RouteEditor],
    ['routes/:id', RouteEditor],
    ['certificates', CertificateList],
    ['dns-providers', DnsProviderList],
    ['streams', StreamList],
    ['redirects', RedirectList],
    ['visitor-pages', VisitorPages],
    ['certificates/:id', CertificateDetails],
    ['users', UserList],
    ['single-sign-on', SsoSettings],
    ['backups', BackupPage],
    ['root-key', RootKeyPage],
    ['replicas', ReplicaList],
    ['agents', AgentList],
    ['audit', AuditLog],
    ['account', Profile],
    ['account/security', Security],
    ['account/sessions', Sessions],
    ['**', NotFound],
  ] as [string, unknown][])('opens /%s with its page', async (path, component) => {
    expect(await componentAt(path)).toBe(component);
  });
});
