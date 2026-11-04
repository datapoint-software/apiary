import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuditEntry } from '../api/models';
import { settle, textOf } from '../testing/dom';
import { RecentActivity } from './recent-activity';

function anEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'entry-1',
    at: '2026-11-04T10:00:00Z',
    user: 'ana@example.com',
    action: 'routes.create',
    affected: [],
    outcome: 'succeeded',
    ...overrides,
  };
}

function setUp() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(RecentActivity);
  fixture.detectChanges();
  return { fixture, backend: TestBed.inject(HttpTestingController) };
}

async function render(entries: AuditEntry[]): Promise<ComponentFixture<RecentActivity>> {
  const { fixture, backend } = setUp();
  backend.expectOne('/api/audit/list').flush(entries);
  await settle(fixture);
  return fixture;
}

function items(fixture: ComponentFixture<RecentActivity>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')].map((li) =>
    (li.textContent ?? '').replace(/\s+/g, ' ').trim(),
  );
}

describe('RecentActivity', () => {
  afterEach(() => vi.useRealTimers());

  it('asks for the last 7 days', () => {
    const { backend } = setUp();

    expect(backend.expectOne('/api/audit/list').request.body).toEqual({
      from: '2026-10-28T12:00:00.000Z',
    });
  });

  it('says who did what and when', async () => {
    const fixture = await render([anEntry()]);

    expect(items(fixture)).toEqual(['ana@example.com created a routeroutes.create2 hours ago']);
  });

  it('marks what was denied, and what Apiary did itself', async () => {
    const fixture = await render([
      anEntry({ outcome: 'denied' }),
      anEntry({ id: 'entry-2', user: undefined, action: 'certificates.renew' }),
    ]);

    expect(items(fixture)).toEqual([
      'Denied: ana@example.com created a routeroutes.create2 hours ago',
      'System renewed a certificatecertificates.renew2 hours ago',
    ]);
  });

  it('shows the four latest entries', async () => {
    const fixture = await render(
      ['1', '2', '3', '4', '5'].map((id) => anEntry({ id: `entry-${id}` })),
    );

    expect(items(fixture)).toHaveLength(4);
  });

  it('says when nothing happened', async () => {
    const fixture = await render([]);

    expect(textOf(fixture)).toContain('Nothing in the last 7 days.');
  });
});
