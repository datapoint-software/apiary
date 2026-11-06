import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { DnsProviderView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aDnsProvider, aProject } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RequestDialog } from './request-dialog';

const hetzner = aDnsProvider({ id: 'hetzner', name: 'Hetzner', kind: 'hetzner', domains: ['example.com'], challengeZone: 'acme.example.net' });
const office = aDnsProvider({ id: 'office', name: 'Office DNS', domains: ['corp.example.com'] });

interface Rendered {
  readonly fixture: ComponentFixture<RequestDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(providers: readonly DnsProviderView[] = [hetzner, office], canAdminister = true): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: { providers, canAdminister } },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(RequestDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1' })]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function enterNames({ fixture }: Rendered, names: string): Promise<void> {
  type(byLabel<HTMLTextAreaElement>(fixture, 'Hostnames'), names);
  await settle(fixture);
}

async function chooseChallenge({ fixture }: Rendered, challenge: 'dns' | 'http'): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type="radio"][value="${challenge}"]`)?.click();
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

function providerOptions({ fixture }: Rendered): string[] {
  return [...byLabel<HTMLSelectElement>(fixture, 'DNS provider').options].map((o) => o.text);
}

describe('RequestDialog', () => {
  it('asks for at least one hostname', async () => {
    const dialog = await render();

    await press(dialog, 'Request certificate');

    expect(errorOf(dialog.fixture, 'Hostnames')).toBe('Fill this in.');
  });

  it.each([
    ['a.*.example.com', 'Enter hostnames such as shop.example.com. A wildcard can only be the first part, as in *.example.com.'],
    [[...Array(11).keys()].map((i) => `h${i}.example.com`).join(', '), 'Enter at most 10 hostnames.'],
  ])('refuses the hostnames %s', async (names, message) => {
    const dialog = await render();

    await enterNames(dialog, names);
    await press(dialog, 'Request certificate');

    expect(errorOf(dialog.fixture, 'Hostnames')).toBe(message);
  });

  it('refuses a wildcard checked with a file on port 80', async () => {
    const dialog = await render();
    await enterNames(dialog, '*.example.com');

    await chooseChallenge(dialog, 'http');
    await press(dialog, 'Request certificate');

    expect(textOf(dialog.fixture)).toContain('Let’s Encrypt issues wildcards only with a DNS record. Choose DNS-01.');
    dialog.backend.expectNone('/api/certificates/request');
  });

  it('offers only the providers that prove every name, and suggests the narrowest', async () => {
    const dialog = await render([hetzner, office]);

    await enterNames(dialog, 'intranet.corp.example.com');

    expect(providerOptions(dialog)).toEqual(['Choose a provider', 'Hetzner', 'Office DNS (RFC 2136)']);
    expect(byLabel<HTMLSelectElement>(dialog.fixture, 'DNS provider').value).toBe('office');
  });

  it('says when no provider proves the names', async () => {
    const dialog = await render([office], false);
    await enterNames(dialog, 'shop.example.org');

    await press(dialog, 'Request certificate');

    expect(providerOptions(dialog)).toEqual(['No provider proves these names']);
    expect(errorOf(dialog.fixture, 'DNS provider')).toBe('No provider proves every one of these names. Ask an Administrator to add one.');
  });

  it('lists the CNAMEs a delegated provider needs', async () => {
    const dialog = await render();

    await enterNames(dialog, '*.example.com\nexample.com');

    expect(textOf(dialog.fixture)).toContain('Hetzner writes challenges in acme.example.net.');
    expect(textOf(dialog.fixture)).toContain('_acme-challenge.example.comCNAMEexample.com.acme.example.net');
  });

  it('requests a wildcard through the chosen provider, in the project', async () => {
    const dialog = await render();
    await enterNames(dialog, '*.Example.com, example.com');

    await press(dialog, 'Request certificate');
    const request = await nextRequest(dialog.backend, '/api/certificates/request');
    request.flush('certificate-9');

    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['certificate-9']));
    expect(request.request.body).toEqual({ names: ['*.example.com', 'example.com'], dnsProviderId: 'hetzner', projectId: 'project-1' });
  });

  it('requests a hostname checked with a file on port 80', async () => {
    const dialog = await render();
    await enterNames(dialog, 'shop.example.com');
    await chooseChallenge(dialog, 'http');

    await press(dialog, 'Request certificate');
    const request = await nextRequest(dialog.backend, '/api/certificates/request');

    expect(request.request.body).toMatchObject({ names: ['shop.example.com'], dnsProviderId: null });
  });
});
