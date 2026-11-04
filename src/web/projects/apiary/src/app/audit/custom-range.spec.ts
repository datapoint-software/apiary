import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
import { AuditRange, CustomRange } from './custom-range';

interface Rendered {
  readonly fixture: ComponentFixture<CustomRange>;
  readonly applied: AuditRange[];
}

async function render(): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  TestBed.configureTestingModule({ providers: [provideErrorMessages(appMessages)] });
  const fixture = TestBed.createComponent(CustomRange);
  const applied: AuditRange[] = [];
  fixture.componentInstance.applied.subscribe((range) => applied.push(range));
  await settle(fixture);
  return { fixture, applied };
}

async function apply({ fixture }: Rendered, from: string, to: string): Promise<void> {
  type(byLabel(fixture, 'From'), from);
  type(byLabel(fixture, 'Until'), to);
  await settle(fixture);
  byRole(fixture, 'button', 'Apply').click();
  await settle(fixture);
}

describe('CustomRange', () => {
  afterEach(() => vi.useRealTimers());

  it('starts with the last 7 days', async () => {
    const { fixture } = await render();

    expect([byLabel(fixture, 'From').value, byLabel(fixture, 'Until').value]).toEqual([
      '2026-10-28 12:00',
      '2026-11-04 12:00',
    ]);
  });

  it('applies the range typed', async () => {
    const range = await render();

    await apply(range, '2026-11-01 00:00', '2026-11-02 00:00');

    expect(range.applied).toEqual([
      { from: Date.parse('2026-11-01T00:00:00Z'), to: Date.parse('2026-11-02T00:00:00Z') },
    ]);
  });

  it('refuses an end before the start', async () => {
    const range = await render();

    await apply(range, '2026-11-02 00:00', '2026-11-01 00:00');

    expect([errorOf(range.fixture, 'Until'), range.applied]).toEqual([
      'Choose an end after the start.',
      [],
    ]);
  });

  it('refuses a start the log no longer keeps', async () => {
    const range = await render();

    await apply(range, '2025-01-01 00:00', '2026-11-01 00:00');

    expect(errorOf(range.fixture, 'From')).toBe(
      'The audit log keeps 1 year. Choose a later start.',
    );
  });
});
