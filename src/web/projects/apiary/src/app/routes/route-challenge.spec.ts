import { aCertificate } from '../testing/builders';
import { namedCertificates, savedChallenge } from './route-challenge';

const wildcard = aCertificate({ id: 'wildcard', name: '*.example.com', hosts: ['*.example.com', 'example.com'], requested: true });
const uploaded = aCertificate({ id: 'uploaded', source: 'uploaded', name: 'intranet.corp', hosts: ['intranet.corp'] });

describe('savedChallenge', () => {
  it('is the DNS provider of the hostname’s own automatic certificate', () => {
    expect(savedChallenge([aCertificate({ name: 'shop.example.com', dnsProviderId: 'provider-1' })], 'Shop.example.com ')).toBe('provider-1');
  });

  it('is a file on port 80 when the hostname has no certificate yet', () => {
    expect(savedChallenge([], 'shop.example.com')).toBe('http-01');
  });
});

describe('namedCertificates', () => {
  it('lists uploaded certificates and the requested wildcards that cover the hostname', () => {
    expect(namedCertificates([wildcard, uploaded, aCertificate()], 'shop.example.com', '').map((c) => c.id)).toEqual(['wildcard', 'uploaded']);
  });

  it('leaves out a wildcard that doesn’t cover the hostname', () => {
    expect(namedCertificates([wildcard], 'a.b.example.com', '').map((c) => c.id)).toEqual([]);
  });

  it('keeps the chosen wildcard even when the hostname changes', () => {
    expect(namedCertificates([wildcard], 'shop.example.net', 'wildcard').map((c) => c.id)).toEqual(['wildcard']);
  });
});
