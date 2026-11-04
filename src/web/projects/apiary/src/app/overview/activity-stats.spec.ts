import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityView } from '../api/models';
import { anActivityPoint } from '../testing/builders';
import { settle } from '../testing/dom';
import { ActivityStats } from './activity-stats';

const now = new Date('2026-11-04T12:00:00Z');
const quietHour: ActivityView = { minutesPerPoint: 1, points: [] };
const busyHour: ActivityView = {
  minutesPerPoint: 1,
  p95Milliseconds: 1200,
  points: [
    anActivityPoint({ at: '2026-11-04T11:58:00Z', requests: 100, errors: 0, p95Milliseconds: 80 }),
    anActivityPoint({
      at: '2026-11-04T11:59:00Z',
      requests: 300,
      errors: 30,
      p95Milliseconds: 1500,
    }),
  ],
};

function setUp() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(ActivityStats);
  fixture.componentRef.setInput('range', 'hour');
  fixture.detectChanges();
  return { fixture, backend: TestBed.inject(HttpTestingController) };
}

async function render(activity: ActivityView) {
  const { fixture, backend } = setUp();
  backend.expectOne('/api/activity/get').flush(activity);
  await settle(fixture);
  return fixture;
}

function stat(fixture: ComponentFixture<ActivityStats>, label: string): string[] {
  const panels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ap-stat')];
  const panel = panels.find((p) => p.querySelector('.ap-overline')?.textContent === label);
  return ['.ap-stat-value', '.ap-stat-delta'].map(
    (part) => panel?.querySelector(part)?.textContent?.trim() ?? '',
  );
}

afterEach(() => vi.useRealTimers());

describe('ActivityStats', () => {
  it('asks for the activity in the chosen range', () => {
    const { backend } = setUp();

    expect(backend.expectOne('/api/activity/get').request.body).toEqual({ range: 'hour' });
  });

  it('says it is loading until the activity arrives', () => {
    const { fixture } = setUp();

    expect(stat(fixture, 'Requests')).toEqual(['0/min', 'Loading…']);
  });

  it('averages the requests per minute since the first point', async () => {
    const fixture = await render(busyHour);

    expect(stat(fixture, 'Requests')).toEqual(['200/min', 'Peak 300/min at 11:59 UTC']);
  });

  it('shows the p95 latency in seconds from one second up', async () => {
    const fixture = await render(busyHour);

    expect(stat(fixture, 'p95 latency')).toEqual(['1.2s', 'Peak 1.5 s at 11:59 UTC']);
  });

  it('shows the p95 latency in milliseconds below one second', async () => {
    const fixture = await render({ ...busyHour, p95Milliseconds: 250 });

    expect(stat(fixture, 'p95 latency')[0]).toBe('250ms');
  });

  it('shows the share of 5xx responses and its worst minute', async () => {
    const fixture = await render(busyHour);

    expect(stat(fixture, '5xx responses')).toEqual(['7.5%', 'Peak 10% at 11:59 UTC']);
  });

  it('says there were no 5xx responses when requests all succeeded', async () => {
    const fixture = await render({
      minutesPerPoint: 1,
      points: [anActivityPoint({ at: '2026-11-04T11:59:00Z', requests: 50, errors: 0 })],
    });

    expect(stat(fixture, '5xx responses')).toEqual(['0%', 'None so far']);
  });

  it('shows a tiny rate as under 0.1', async () => {
    const fixture = await render({
      minutesPerPoint: 1,
      points: [anActivityPoint({ at: '2026-11-04T10:00:00Z', requests: 1 })],
    });

    expect(stat(fixture, 'Requests')[0]).toBe('<0.1/min');
  });

  it('says a quiet hour had no requests', async () => {
    const fixture = await render(quietHour);

    expect(
      ['Requests', 'p95 latency', '5xx responses'].map((label) => stat(fixture, label)[1]),
    ).toEqual([
      'No requests in the last hour',
      'No requests in the last hour',
      'No requests in the last hour',
    ]);
  });

  it('shows no p95 latency for a quiet hour', async () => {
    const fixture = await render(quietHour);

    expect(stat(fixture, 'p95 latency')[0]).toBe('–');
  });
});
