import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { CertificateSummary, DnsProviderView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus } from '../testing/backend';
import { aCertificate, aDnsProvider, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { CertificateList } from './certificate-list';
import { RequestDialog } from './request-dialog';
import { UploadDialog } from './upload-dialog';

const now = new Date('2026-11-04T12:00:00Z');

async function render(
  certificates: CertificateSummary[],
  role: Role = 'operator',
  dialog = new ClosingDialog(),
  providers: DnsProviderView[] = [],
) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'certificates/:id', children: [] }]),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(CertificateList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/certificates/list').flush(certificates);
  backend.expectOne('/api/dns-providers/list').flush(providers);
  backend.match('/api/admin-certificate/get').forEach((request) => request.flush(null));
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

afterEach(() => vi.useRealTimers());

describe('CertificateList', () => {
  it('shows each certificate’s hostname, source, check, issuer, expiry, status and routes', async () => {
    const { fixture } = await render([
      aCertificate({
        name: 'shop.example.com',
        issuer: 'R11',
        notAfter: '2026-12-04T12:00:00Z',
        routeCount: 2,
      }),
    ]);

    expect(cellsOfRow(fixture, 'shop.example.com')).toEqual([
      'shop.example.com',
      'Automatic',
      'HTTP-01',
      'R11',
      '2026-12-04',
      '30 days left',
      '2',
    ]);
  });

  it('counts the other hostnames a certificate covers', async () => {
    const { fixture } = await render([
      aCertificate({
        name: 'example.com',
        hosts: ['example.com', 'www.example.com', 'a.example.com'],
      }),
    ]);

    expect(textOf(fixture)).toContain('and 2 more');
  });

  it('shows a dash for a certificate not issued yet', async () => {
    const { fixture } = await render([
      aCertificate({ name: 'new.example.com', status: 'pending', source: 'uploaded' }),
    ]);

    expect(cellsOfRow(fixture, 'new.example.com').slice(1, 6)).toEqual([
      'Uploaded',
      '–',
      '–',
      '–',
      'Requesting from Let’s Encrypt',
    ]);
  });

  it.each([
    [aCertificate({ status: 'failing' }), 'Not issued yet'],
    [
      aCertificate({ status: 'failing', notAfter: '2026-11-05T12:00:00Z' }),
      'Renewal failing, 1 day left',
    ],
    [
      aCertificate({ status: 'expiring', notAfter: '2026-11-09T12:00:00Z' }),
      'Expires soon, 5 days left',
    ],
    [aCertificate({ status: 'expired', notAfter: '2026-11-01T12:00:00Z' }), 'Expired'],
  ])('describes the status of a certificate that needs attention', async (certificate, status) => {
    const { fixture } = await render([certificate]);

    expect(cellsOfRow(fixture, certificate.name)[5]).toBe(status);
  });

  it('warns about an expired certificate', async () => {
    const { fixture } = await render([
      aCertificate({ name: 'old.example.com', status: 'expired', source: 'uploaded' }),
    ]);

    expect(textOf(fixture)).toContain(
      'The certificate for old.example.com expired Upload a new one before it expires. Apiary doesn’t renew uploaded certificates.',
    );
  });

  it('warns about a certificate that expires soon', async () => {
    const { fixture } = await render([
      aCertificate({
        name: 'soon.example.com',
        status: 'expiring',
        notAfter: '2026-11-07T12:00:00Z',
      }),
    ]);

    expect(textOf(fixture)).toContain('The certificate for soon.example.com expires in 3 days');
  });

  it('explains why Apiary can’t get a certificate', async () => {
    const { fixture } = await render([
      aCertificate({
        name: 'dns.example.com',
        status: 'failing',
        failureCode: 'acme.rateLimited',
      }),
    ]);

    expect(textOf(fixture)).toContain(
      'Apiary can’t get a certificate for dns.example.com Let’s Encrypt’s rate limit was reached for this hostname or account.',
    );
  });

  it('links each warning to the certificate', async () => {
    const { fixture } = await render([aCertificate({ id: 'certificate-7', status: 'expired' })]);

    expect(byRole(fixture, 'link', 'See details').getAttribute('href')).toBe(
      '/certificates/certificate-7',
    );
  });

  it('doesn’t warn about a certificate being requested', async () => {
    const { fixture } = await render([aCertificate({ status: 'pending' })]);

    expect(queryByRole(fixture, 'link', 'See details')).toBeUndefined();
  });

  it('explains where certificates come from when there are none', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No certificates yet')).toBeTruthy();
  });

  it('offers an operator to request the first certificate', async () => {
    const { fixture } = await render([]);

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].filter(
        (button) => button.textContent?.trim() === 'Request certificate',
      ),
    ).toHaveLength(2);
  });

  it('says which DNS provider checks a certificate', async () => {
    const { fixture } = await render([aCertificate({ name: 'wiki.corp.example.com', dnsProviderId: 'provider-1' })], 'operator', new ClosingDialog(), [
      aDnsProvider({ id: 'provider-1', name: 'Office DNS' }),
    ]);

    expect(cellsOfRow(fixture, 'wiki.corp.example.com')[2]).toBe('DNS-01 · Office DNS');
  });

  it('says a requested certificate no route uses yet is ready ahead', async () => {
    const { fixture } = await render([aCertificate({ name: '*.example.com', requested: true, routeCount: 0 })]);

    expect(cellsOfRow(fixture, '*.example.com')[6]).toBe('Ready ahead');
  });

  it('warns that certificates checked through a failing DNS provider can’t renew', async () => {
    const { fixture } = await render([], 'operator', new ClosingDialog(), [
      aDnsProvider({ name: 'Office DNS', lastTest: { at: '2026-11-04T10:00:00Z', succeeded: false, code: 'dns.unauthorized' } }),
    ]);

    expect(textOf(fixture)).toContain('Office DNS is failing Certificates checked through it can’t renew. See DNS providers');
  });

  it('requests a certificate with the DNS providers, then opens it', async () => {
    const office = aDnsProvider();
    const { fixture, dialog } = await render([], 'administrator', new ClosingDialog('certificate-9'), [office]);

    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Request certificate')?.click();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/certificates/certificate-9'));
    expect(dialog.opened[0]).toEqual({ component: RequestDialog, data: { providers: [office], canAdminister: true } });
  });

  it('offers a viewer no way to upload a certificate', async () => {
    const { fixture } = await render([], 'viewer');

    expect(queryByRole(fixture, 'button', 'Upload certificate')).toBeUndefined();
  });

  it('opens the uploaded certificate', async () => {
    const { fixture, dialog } = await render(
      [aCertificate()],
      'operator',
      new ClosingDialog('certificate-9'),
    );

    byRole(fixture, 'button', 'Upload certificate').click();
    await settle(fixture);

    expect(dialog.opened[0].component).toBe(UploadDialog);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/certificates/certificate-9'));
  });

  it('stays on the list when the upload is cancelled', async () => {
    const { fixture } = await render([aCertificate()]);

    byRole(fixture, 'button', 'Upload certificate').click();
    await settle(fixture);

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('shows the admin interface’s certificate to an administrator', async () => {
    const { fixture } = await render([aCertificate()], 'administrator');

    expect(byRole(fixture, 'heading', 'Admin interface')).toBeTruthy();
  });

  it('hides the admin interface’s certificate from an operator', async () => {
    const { fixture } = await render([aCertificate()], 'operator');

    expect(queryByRole(fixture, 'heading', 'Admin interface')).toBeUndefined();
  });
});
