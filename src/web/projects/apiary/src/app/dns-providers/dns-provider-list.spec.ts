import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { DnsProviderDetails, DnsProviderView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aDnsProvider, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { DnsProviderDialog } from './dns-provider-dialog';
import { DnsProviderList } from './dns-provider-list';

const now = new Date('2026-11-04T12:00:00Z');
const office = aDnsProvider({
  id: 'provider-1',
  name: 'Office DNS',
  domains: ['corp.example.com', 'lab.example.com'],
  challengeZone: 'acme.example.net',
  lastTest: { at: '2026-11-04T10:00:00Z', succeeded: true },
  changedAt: '2026-11-04T11:00:00Z',
  changedBy: 'ana@example.com',
});
const expired = aDnsProvider({
  id: 'provider-2',
  name: 'Cloudflare',
  kind: 'cloudflare',
  domains: ['example.com'],
  lastTest: { at: '2026-11-04T09:00:00Z', succeeded: false, code: 'dns.unauthorized', detail: 'HTTP 403 from api.cloudflare.com' },
});
const details: DnsProviderDetails = { provider: office, settings: {}, secretsSet: ['secret'], certificates: [] };

interface Rendered {
  readonly fixture: ComponentFixture<DnsProviderList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(providers: DnsProviderView[], role: Role = 'administrator', dialog = new ClosingDialog()): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(DnsProviderList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/dns-providers/list').flush(providers);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

function toasts() {
  return TestBed.inject(Toaster).toasts();
}

afterEach(() => vi.useRealTimers());

describe('DnsProviderList', () => {
  it('shows each provider’s kind, domains, zone, last test and certificates', async () => {
    const { fixture } = await render([aDnsProvider({ ...office, certificateCount: 2 })]);

    expect(cellsOfRow(fixture, 'Office DNS').slice(0, 6)).toEqual([
      'Office DNSChanged 1 hour ago by ana@example.com',
      'RFC 2136',
      'corp.example.com lab.example.com',
      'acme.example.netDelegated',
      'WorksTested 2026-11-04 10:00 UTC',
      '2',
    ]);
  });

  it('says when a provider writes in the domain’s own zone and hasn’t been tested', async () => {
    const { fixture } = await render([aDnsProvider({ challengeZone: undefined, lastTest: undefined })]);

    expect(cellsOfRow(fixture, 'Office DNS').slice(3, 5)).toEqual(['The domain’s own zone', 'Not tested yet']);
  });

  it('warns about a provider whose last test failed', async () => {
    const { fixture } = await render([office, expired]);

    expect(textOf(fixture)).toContain(
      'Cloudflare is failing The DNS provider refused Apiary’s credentials. Check that they haven’t expired or been revoked, and save new ones on the provider. HTTP 403 from api.cloudflare.comSave new credentials',
    );
  });

  it('asks a viewer to find an Administrator for new credentials, and offers no changes', async () => {
    const { fixture } = await render([expired], 'viewer');

    expect([
      textOf(fixture).includes('Ask an Administrator to save new credentials.'),
      queryByRole(fixture, 'button', 'Add DNS provider'),
      queryByRole(fixture, 'button', 'Test Cloudflare'),
      queryByRole(fixture, 'button', 'Edit Cloudflare'),
      queryByRole(fixture, 'button', 'Delete Cloudflare'),
    ]).toEqual([true, undefined, undefined, undefined, undefined]);
  });

  it('explains DNS providers when there are none', async () => {
    const { fixture } = await render([], 'operator');

    expect(textOf(fixture)).toContain('An Administrator adds them. Until then, certificates are checked with a file on port 80.');
  });

  it('opens the dialog to add a provider', async () => {
    const list = await render([]);

    byRole(list.fixture, 'button', 'Add DNS provider').click();
    await settle(list.fixture);

    expect(list.dialog.opened[0]).toEqual({ component: DnsProviderDialog, data: { details: null, providers: [] } });
  });

  it('loads a provider’s settings before editing it', async () => {
    const list = await render([office]);

    byRole(list.fixture, 'button', 'Edit Office DNS').click();
    (await nextRequest(list.backend, '/api/dns-providers/get')).flush(details);

    await vi.waitFor(() => expect(list.dialog.opened[0]?.data).toEqual({ details, providers: [office] }));
  });

  it('says what the test of a new provider wrote', async () => {
    const saved = { name: 'Office DNS', added: true, delegated: true, record: '_apiary-test.acme.example.net', test: { at: '2026-11-04T12:00:00Z', succeeded: true } };
    const list = await render([], 'administrator', new ClosingDialog(saved));

    byRole(list.fixture, 'button', 'Add DNS provider').click();

    await vi.waitFor(() =>
      expect(toasts()[0]).toMatchObject({
        heading: 'Provider added',
        text: 'Wrote a TXT record at _apiary-test.acme.example.net and removed it. Certificates list the CNAMEs to create when you request them.',
      }),
    );
  });

  it('says a provider was saved even though its test failed', async () => {
    const saved = { name: 'Office DNS', added: false, delegated: false, record: '', test: { at: '2026-11-04T12:00:00Z', succeeded: false, code: 'dns.unreachable' } };
    const list = await render([office], 'administrator', new ClosingDialog(saved));

    byRole(list.fixture, 'button', 'Edit Office DNS').click();
    (await nextRequest(list.backend, '/api/dns-providers/get')).flush(details);

    await vi.waitFor(() =>
      expect(toasts()[0]).toMatchObject({
        tone: 'error',
        heading: 'Saved, but Office DNS failed the test',
        text: 'Apiary couldn’t reach the DNS provider. It tries again in 5 minutes; nothing reached Let’s Encrypt.',
      }),
    );
  });

  it('tests a provider and says it works', async () => {
    const list = await render([office]);

    byRole(list.fixture, 'button', 'Test Office DNS').click();
    const request = await nextRequest(list.backend, '/api/dns-providers/test');
    request.flush({ at: '2026-11-04T12:00:00Z', succeeded: true });

    await vi.waitFor(() =>
      expect(toasts()[0]).toMatchObject({ heading: 'Office DNS works', text: 'Wrote a TXT record at _apiary-test.acme.example.net and removed it.' }),
    );
    expect(request.request.body).toEqual({ id: 'provider-1' });
  });

  it('says why a provider failed its test', async () => {
    const list = await render([office]);

    byRole(list.fixture, 'button', 'Test Office DNS').click();
    (await nextRequest(list.backend, '/api/dns-providers/test')).flush({ at: '2026-11-04T12:00:00Z', succeeded: false, code: 'dns.zoneNotFound', detail: 'No zone for acme.example.net' });

    await vi.waitFor(() =>
      expect(toasts()[0]).toMatchObject({
        tone: 'error',
        heading: 'Office DNS failed the test',
        text: 'The DNS provider has no zone for this hostname. Check the provider’s domains, or the CNAME that delegates it. No zone for acme.example.net',
      }),
    );
  });

  it('asks before it deletes a provider, and reminds to revoke its credentials', async () => {
    const list = await render([office]);

    byRole(list.fixture, 'button', 'Delete Office DNS').click();
    const request = await nextRequest(list.backend, '/api/dns-providers/remove');
    request.flush(null);

    await vi.waitFor(() => expect(toasts()[0]).toMatchObject({ heading: 'Office DNS deleted', text: 'Revoke its credentials at the provider.' }));
    expect(list.confirmer.asked[0]).toMatchObject({ heading: 'Delete Office DNS?', confirm: 'Delete provider' });
    expect(request.request.body).toEqual({ id: 'provider-1' });
  });

  it('refuses to delete a provider that certificates are checked through', async () => {
    const list = await render([aDnsProvider({ ...office, certificateCount: 2 })]);

    byRole(list.fixture, 'button', 'Delete Office DNS').click();
    (await nextRequest(list.backend, '/api/dns-providers/get')).flush({ ...details, certificates: ['*.corp.example.com', 'wiki.lab.example.com'] });

    await vi.waitFor(() =>
      expect(toasts()[0]).toMatchObject({
        tone: 'error',
        heading: 'Office DNS is in use',
        text: '*.corp.example.com, wiki.lab.example.com are checked through it. Change how they’re checked first.',
      }),
    );
    expect(list.confirmer.asked).toEqual([]);
  });
});
