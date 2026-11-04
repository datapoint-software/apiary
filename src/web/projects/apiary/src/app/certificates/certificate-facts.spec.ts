import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CertificateDetails } from '../api/models';
import { aCertificate, aCertificateDetails } from '../testing/builders';
import { allByRole, byRole, settle } from '../testing/dom';
import { CertificateFacts } from './certificate-facts';

async function render(details: CertificateDetails, canDelete = false) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(CertificateFacts);
  fixture.componentRef.setInput('details', details);
  fixture.componentRef.setInput('canDelete', canDelete);
  await settle(fixture);
  return fixture;
}

function fact(fixture: ComponentFixture<CertificateFacts>, term: string): string | undefined {
  const terms = [...(fixture.nativeElement as HTMLElement).querySelectorAll('dt')];
  const found = terms.find((dt) => dt.textContent?.trim() === term);
  return found?.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim();
}

describe('CertificateFacts', () => {
  it('lists the hostnames it covers', async () => {
    const fixture = await render(
      aCertificateDetails({
        certificate: aCertificate({ hosts: ['example.com', '*.example.com'] }),
      }),
    );

    expect(fact(fixture, 'Covers')).toBe('example.com, *.example.com');
  });

  it('shows when it is valid, in UTC', async () => {
    const certificate = aCertificate({
      notBefore: '2026-09-01T10:00:00Z',
      notAfter: '2026-11-30T10:00:00Z',
    });

    const fixture = await render(aCertificateDetails({ certificate }));

    expect(fact(fixture, 'Valid')).toBe('2026-09-01 10:00 to 2026-11-30 10:00 UTC');
  });

  it.each([
    [aCertificate({ source: 'automatic' }), 'As soon as Let’s Encrypt can reach the hostname'],
    [
      aCertificate({ source: 'automatic', renewsFrom: '2026-11-01T10:00:00Z' }),
      'From 2026-11-01, retrying until it works',
    ],
    [
      aCertificate({ source: 'uploaded', renewsFrom: '2026-11-01T10:00:00Z' }),
      'Manual: upload a new one before it expires',
    ],
  ])('explains the renewal of %j', async (certificate, expected) => {
    const fixture = await render(aCertificateDetails({ certificate }));

    expect(fact(fixture, 'Renewal')).toBe(expected);
  });

  it('counts the certificates in the chain', async () => {
    const fixture = await render(aCertificateDetails({ chainLength: 2 }));

    expect(fact(fixture, 'Chain')).toBe('2 certificates');
  });

  it('leaves out an unknown chain', async () => {
    const fixture = await render(aCertificateDetails({ chainLength: 0 }));

    expect(fact(fixture, 'Chain')).toBeUndefined();
  });

  it('links to the routes that use it', async () => {
    const routes = [
      { id: 'route-1', host: 'shop.example.com', path: '/' },
      { id: 'route-2', host: 'shop.example.com', path: '/cart' },
    ];

    const fixture = await render(aCertificateDetails({ routes }));

    expect(allByRole(fixture, 'link')).toEqual(['shop.example.com', 'shop.example.com/cart']);
  });

  it('says when no route uses it', async () => {
    const fixture = await render(aCertificateDetails({ routes: [] }));

    expect(fact(fixture, 'Used by')).toBe('No routes');
  });

  it('warns when an unused certificate is going to be deleted', async () => {
    const certificate = aCertificate({ unusedSince: '2026-10-20T08:00:00Z' });

    const fixture = await render(aCertificateDetails({ certificate, routes: [] }));

    expect(fact(fixture, 'Used by')).toBe(
      'No routes since 2026-10-20. Apiary deletes it 30 days later.',
    );
  });

  it('can’t be deleted while routes use it', async () => {
    const routes = [{ id: 'route-1', host: 'shop.example.com', path: '/' }];

    const fixture = await render(aCertificateDetails({ routes }), true);

    expect(byRole<HTMLButtonElement>(fixture, 'button', 'Delete…').disabled).toBe(true);
  });

  it('asks to delete an unused certificate', async () => {
    const fixture = await render(aCertificateDetails({ routes: [] }), true);
    const requests: string[] = [];
    fixture.componentInstance.delete.subscribe(() => requests.push('delete'));

    byRole(fixture, 'button', 'Delete…').click();

    expect(requests).toEqual(['delete']);
  });

  it('offers no delete button to someone who can’t delete', async () => {
    const fixture = await render(aCertificateDetails({ routes: [] }), false);

    expect(allByRole(fixture, 'button')).toEqual([]);
  });
});
