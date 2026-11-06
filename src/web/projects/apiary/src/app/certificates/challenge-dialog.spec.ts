import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { CertificateSummary, DnsProviderView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aCertificate, aDnsProvider } from '../testing/builders';
import { byRole, settle, textOf } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { ChallengeDialog } from './challenge-dialog';

const hetzner = aDnsProvider({ id: 'hetzner', name: 'Hetzner', kind: 'hetzner', domains: ['example.com'], challengeZone: 'acme.example.net' });
const office = aDnsProvider({ id: 'office', name: 'Office DNS', domains: ['corp.example.com'] });
const shop = aCertificate({ name: 'shop.example.com', hosts: ['shop.example.com'] });

interface Rendered {
  readonly fixture: ComponentFixture<ChallengeDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(certificate: CertificateSummary = shop, providers: readonly DnsProviderView[] = [hetzner, office], canAdminister = true): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: { certificate, providers, canAdminister } },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(ChallengeDialog);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController), ref };
}

function choices({ fixture }: Rendered): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('label.ap-choice')].map((label) => label.textContent?.replace(/\s+/g, ' ').trim() ?? '');
}

async function chooseValue({ fixture }: Rendered, value: string): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)?.click();
  await settle(fixture);
}

describe('ChallengeDialog', () => {
  it('offers a file on port 80 and the providers that prove the hostname', async () => {
    const dialog = await render();

    expect(choices(dialog)).toEqual([
      'A file on port 80 (HTTP-01)Needs the hostname to point at your edge nodes, with port 80 open.',
      'A DNS record through HetznerNeeds the CNAME _acme-challenge.shop.example.com → shop.example.com.acme.example.net',
    ]);
  });

  it('offers no file on port 80 for a wildcard', async () => {
    const dialog = await render(aCertificate({ name: '*.corp.example.com', hosts: ['*.corp.example.com'], dnsProviderId: 'office' }), [office]);

    expect(choices(dialog)).toEqual(['A DNS record through Office DNSWrites in the domain’s own zone']);
  });

  it('says when no provider proves the hostname', async () => {
    const dialog = await render(aCertificate({ name: 'shop.example.org', hosts: ['shop.example.org'] }), [office], false);

    expect(textOf(dialog.fixture)).toContain('No DNS provider proves shop.example.org. Ask an Administrator to add one.');
  });

  it('switches the certificate to a DNS record through the chosen provider', async () => {
    const dialog = await render();
    await chooseValue(dialog, 'hetzner');

    byRole(dialog.fixture, 'button', 'Save').click();
    const request = await nextRequest(dialog.backend, '/api/certificates/set-challenge');
    request.flush(null);
    await settle(dialog.fixture);

    expect(request.request.body).toEqual({ name: 'shop.example.com', dnsProviderId: 'hetzner' });
    expect(dialog.ref.results).toEqual(['hetzner']);
  });

  it('switches back to a file on port 80', async () => {
    const dialog = await render(aCertificate({ ...shop, dnsProviderId: 'hetzner' }));
    await chooseValue(dialog, 'http-01');

    byRole(dialog.fixture, 'button', 'Save').click();
    const request = await nextRequest(dialog.backend, '/api/certificates/set-challenge');

    expect(request.request.body).toEqual({ name: 'shop.example.com', dnsProviderId: null });
  });
});
