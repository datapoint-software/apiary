import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CertificateSummary } from '../api/models';
import { answerAll } from '../testing/answer-all';
import { aCertificate } from '../testing/builders';
import { textOf } from '../testing/dom';
import { CertificateMeters } from './certificate-meters';

async function render(
  certificates: CertificateSummary[],
): Promise<ComponentFixture<CertificateMeters>> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(CertificateMeters);
  await answerAll(fixture, TestBed.inject(HttpTestingController), {
    '/api/certificates/list': certificates,
  });
  return fixture;
}

function meters(fixture: ComponentFixture<CertificateMeters>): string[][] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="meter"]')].map((m) => [
    m.getAttribute('aria-label') ?? '',
    m.getAttribute('aria-valuenow') ?? '',
    m.getAttribute('aria-valuemax') ?? '',
  ]);
}

function aCertificateFor(name: string, daysLeft: number): CertificateSummary {
  return aCertificate({
    id: name,
    name,
    notBefore: new Date(
      Date.parse('2026-11-04T12:00:00Z') - (90 - daysLeft) * 86_400_000,
    ).toISOString(),
    notAfter: new Date(Date.parse('2026-11-04T12:00:00Z') + daysLeft * 86_400_000).toISOString(),
  });
}

describe('CertificateMeters', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the days left out of each certificate’s lifetime', async () => {
    const fixture = await render([aCertificateFor('shop.example.com', 60)]);

    expect(meters(fixture)).toEqual([['Days left for shop.example.com', '60', '90']]);
  });

  it('shows the four that expire first', async () => {
    const fixture = await render([
      aCertificateFor('a.example.com', 80),
      aCertificateFor('b.example.com', 10),
      aCertificateFor('c.example.com', 50),
      aCertificateFor('d.example.com', 30),
      aCertificateFor('e.example.com', 20),
    ]);

    expect(meters(fixture).map(([, days]) => days)).toEqual(['10', '20', '30', '50']);
  });

  it('shows a short fill for a certificate never issued', async () => {
    const fixture = await render([aCertificate({ status: 'pending' })]);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ap-meter-fill')?.style
        .width,
    ).toBe('2%');
  });

  it('says when there are no certificates', async () => {
    const fixture = await render([]);

    expect(textOf(fixture)).toContain('No certificates yet. Each route gets one automatically.');
  });
});
