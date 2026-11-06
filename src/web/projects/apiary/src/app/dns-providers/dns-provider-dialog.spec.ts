import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { DnsProviderDetails, DnsProviderView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aDnsProvider, aProblem } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { DnsProviderDialog } from './dns-provider-dialog';

const hetzner = aDnsProvider({ id: 'provider-2', name: 'Hetzner', kind: 'hetzner', domains: ['example.org'] });
const passed = { at: '2026-11-04T12:00:00Z', succeeded: true };

const office: DnsProviderDetails = {
  provider: aDnsProvider({ id: 'provider-1', name: 'Office DNS', domains: ['corp.example.com'], challengeZone: 'acme.example.net' }),
  settings: { server: 'ns1.corp.example.com', port: '5353', keyName: 'apiary-acme', algorithm: 'hmac-sha512' },
  secretsSet: ['secret'],
  certificates: [],
};

interface Rendered {
  readonly fixture: ComponentFixture<DnsProviderDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(details: DnsProviderDetails | null = null, providers: readonly DnsProviderView[] = [hetzner]): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: { details, providers } },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(DnsProviderDialog);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController), ref };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel<HTMLInputElement | HTMLTextAreaElement>(fixture, label), value);
  await settle(fixture);
}

async function pick({ fixture }: Rendered, label: string, value: string): Promise<void> {
  choose(byLabel<HTMLSelectElement>(fixture, label), value);
  await settle(fixture);
}

async function chooseWhere({ fixture }: Rendered, where: 'delegate' | 'direct'): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type="radio"][value="${where}"]`)?.click();
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

async function fillInOfficeServer(dialog: Rendered): Promise<void> {
  await fillIn(dialog, 'Name', 'Office DNS');
  await fillIn(dialog, 'Domains it proves', 'corp.example.com\nlab.example.com');
  await fillIn(dialog, 'Challenge zone', 'acme.example.net');
  await fillIn(dialog, 'Server', 'ns1.corp.example.com');
  await fillIn(dialog, 'TSIG key name', 'apiary-acme');
  await fillIn(dialog, 'TSIG secret', 'c2VjcmV0');
}

describe('DnsProviderDialog', () => {
  it('asks for a name, the domains, the challenge zone and the server’s details', async () => {
    const dialog = await render();

    await press(dialog, 'Add and test');

    expect([
      errorOf(dialog.fixture, 'Name'),
      errorOf(dialog.fixture, 'Domains it proves'),
      errorOf(dialog.fixture, 'Challenge zone'),
      errorOf(dialog.fixture, 'Server'),
      errorOf(dialog.fixture, 'TSIG secret'),
    ]).toEqual([
      'Fill this in.',
      'Fill this in.',
      'Enter a hostname, such as shop.example.com.',
      'Fill this in.',
      'Fill this in.',
    ]);
  });

  it('refuses a name another provider has', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'hetzner');
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, 'Name')).toBe('Another provider has this name. Choose another.');
  });

  it('refuses a name longer than 60 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'x'.repeat(61));
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, 'Name')).toBe('Use at most 60 characters.');
  });

  it.each([
    ['*.example.com', 'Use letters, digits and hyphens in each part of the hostname'],
    ['example.org', 'Another provider already proves one of these domains. Edit that provider, or enter a narrower domain.'],
    [[...Array(21).keys()].map((i) => `d${i}.example.com`).join('\n'), 'Enter at most 20 domains.'],
  ])('refuses the domains %s', async (domains, message) => {
    const dialog = await render();

    await fillIn(dialog, 'Domains it proves', domains);
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, 'Domains it proves')).toContain(message);
  });

  it('refuses a challenge zone that is one of the domains it proves', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Domains it proves', 'example.com');
    await fillIn(dialog, 'Challenge zone', 'Example.com');
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, 'Challenge zone')).toBe('Use a zone other than the domains it proves, so the credentials can’t reach them.');
  });

  it('refuses a TSIG secret that isn’t Base64', async () => {
    const dialog = await render();

    await fillIn(dialog, 'TSIG secret', 'not base64!');
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, 'TSIG secret')).toBe('Enter the secret in Base64, as tsig-keygen prints it.');
  });

  it('shows the CNAME a hostname would need in the challenge zone', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Domains it proves', 'example.com');
    await fillIn(dialog, 'Challenge zone', 'acme.example.net');

    expect(textOf(dialog.fixture)).toContain('_acme-challenge.shop.example.comCNAMEshop.example.com.acme.example.net');
  });

  it('asks for no challenge zone when the records go in the domain’s own zone', async () => {
    const dialog = await render();

    await chooseWhere(dialog, 'direct');

    expect(textOf(dialog.fixture)).not.toContain('Challenge zone');
  });

  it.each([
    ['hetzner', 'API token'],
    ['cloudflare', 'API token'],
    ['azure', 'Tenant ID'],
    ['azure', 'Client ID'],
    ['azure', 'Client secret'],
    ['azure', 'Subscription ID'],
    ['azure', 'Resource group'],
    ['route53', 'Access key ID'],
    ['route53', 'Secret access key'],
  ])('asks %s for the %s', async (kind, label) => {
    const dialog = await render();

    await pick(dialog, 'Provider', kind);
    await press(dialog, 'Add and test');

    expect(errorOf(dialog.fixture, label)).toBe('Fill this in.');
  });

  it('adds an RFC 2136 server and returns how its test went', async () => {
    const dialog = await render();
    await fillInOfficeServer(dialog);

    await press(dialog, 'Add and test');
    const request = await nextRequest(dialog.backend, '/api/dns-providers/add');
    request.flush({ id: 'provider-9', test: passed });
    await settle(dialog.fixture);

    expect(request.request.body).toEqual({
      name: 'Office DNS',
      kind: 'rfc2136',
      domains: ['corp.example.com', 'lab.example.com'],
      challengeZone: 'acme.example.net',
      server: 'ns1.corp.example.com',
      keyName: 'apiary-acme',
      port: 53,
      algorithm: 'hmac-sha256',
      secret: 'c2VjcmV0',
    });
    expect(dialog.ref.results).toEqual([{ name: 'Office DNS', added: true, delegated: true, record: '_apiary-test.acme.example.net', test: passed }]);
  });

  it('sends only what the chosen kind needs', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', 'Cloudflare');
    await fillIn(dialog, 'Domains it proves', 'example.com');
    await chooseWhere(dialog, 'direct');
    await pick(dialog, 'Provider', 'cloudflare');
    await fillIn(dialog, 'API token', 'token-1');

    await press(dialog, 'Add and test');
    const request = await nextRequest(dialog.backend, '/api/dns-providers/add');

    expect(request.request.body).toEqual({ name: 'Cloudflare', kind: 'cloudflare', domains: ['example.com'], challengeZone: null, token: 'token-1' });
  });

  it('fills in a provider’s settings, but never its secret', async () => {
    const dialog = await render(office);

    expect([
      byLabel(dialog.fixture, 'Server').value,
      byLabel(dialog.fixture, 'Port').value,
      byLabel<HTMLSelectElement>(dialog.fixture, 'Algorithm').value,
      byLabel(dialog.fixture, 'TSIG secret (optional)').value,
      byLabel(dialog.fixture, 'TSIG secret (optional)').placeholder,
    ]).toEqual(['ns1.corp.example.com', '5353', 'hmac-sha512', '', 'Saved. Enter a new value to replace it.']);
  });

  it('keeps the saved secret when it’s left empty', async () => {
    const dialog = await render(office);

    await press(dialog, 'Save and test');
    const request = await nextRequest(dialog.backend, '/api/dns-providers/update');

    expect(request.request.body).toMatchObject({ id: 'provider-1', secret: null, port: 5353 });
  });

  it('asks for a new secret when the kind changes', async () => {
    const dialog = await render(office);

    await pick(dialog, 'Provider', 'hetzner');
    await press(dialog, 'Save and test');

    expect(errorOf(dialog.fixture, 'API token')).toBe('Fill this in.');
  });

  it('puts the server’s errors on the fields', async () => {
    const dialog = await render(office);

    await press(dialog, 'Save and test');
    (await nextRequest(dialog.backend, '/api/dns-providers/update')).flush(
      aProblem(400, 'validation.failed', [{ field: 'name', code: 'dnsProvider.nameTaken' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Name')).toBe('Another provider has this name. Choose another.');
    expect(dialog.ref.results).toEqual([]);
  });
});
