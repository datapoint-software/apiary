import { addMonths, dayMs, dayStart, formatUtc, hourMs, minuteMs, parseUtc } from './utc-date';

describe('parseUtc', () => {
  it('reads a date and time as UTC', () => {
    expect(parseUtc('2026-11-03 14:05')).toBe(Date.UTC(2026, 10, 3, 14, 5));
  });

  it('reads a date alone when no time is expected', () => {
    expect(parseUtc('2026-11-03', false)).toBe(Date.UTC(2026, 10, 3));
  });

  it.each(['0026-11-03 14:00', '1969-12-31 23:59'])('refuses %j, a year before 1970', (text) => {
    expect(parseUtc(text)).toBeNull();
  });

  it('ignores surrounding spaces', () => {
    expect(parseUtc('  2026-11-03 14:05  ')).toBe(Date.UTC(2026, 10, 3, 14, 5));
  });

  it.each([
    ['', true],
    ['2026-11-03', true],
    ['2026-11-03 14:05', false],
    ['03/11/2026 14:05', true],
    ['2026-11-3 14:05', true],
    ['2026-02-29 10:00', true],
    ['2026-04-31 10:00', true],
    ['2026-13-01 10:00', true],
    ['2026-11-03 24:00', true],
    ['2026-11-03 14:60', true],
  ])('refuses %j when time is expected is %s', (text, withTime) => {
    expect(parseUtc(text, withTime)).toBeNull();
  });

  it('accepts the 29th of February in a leap year', () => {
    expect(parseUtc('2028-02-29 00:00')).toBe(Date.UTC(2028, 1, 29));
  });
});

describe('formatUtc', () => {
  it('writes a date and time in UTC with padding', () => {
    expect(formatUtc(Date.UTC(2026, 0, 5, 7, 3))).toBe('2026-01-05 07:03');
  });

  it('writes the date alone without time', () => {
    expect(formatUtc(Date.UTC(2026, 0, 5, 7, 3), false)).toBe('2026-01-05');
  });

  it('round-trips with parseUtc', () => {
    expect(formatUtc(parseUtc('2026-11-03 14:05') ?? 0)).toBe('2026-11-03 14:05');
  });
});

describe('dayStart', () => {
  it('drops the time of day', () => {
    expect(dayStart(Date.UTC(2026, 10, 3, 23, 59) + 59 * 1000)).toBe(Date.UTC(2026, 10, 3));
  });

  it('keeps a midnight as it is', () => {
    expect(dayStart(Date.UTC(2026, 10, 3))).toBe(Date.UTC(2026, 10, 3));
  });
});

describe('addMonths', () => {
  it.each([
    [Date.UTC(2026, 10, 3), 1, Date.UTC(2026, 11, 3)],
    [Date.UTC(2026, 11, 15), 1, Date.UTC(2027, 0, 15)],
    [Date.UTC(2026, 0, 15), -1, Date.UTC(2025, 11, 15)],
    [Date.UTC(2026, 0, 31), 1, Date.UTC(2026, 1, 28)],
    [Date.UTC(2028, 0, 31), 1, Date.UTC(2028, 1, 29)],
    [Date.UTC(2026, 2, 31), -1, Date.UTC(2026, 1, 28)],
    [Date.UTC(2026, 10, 3), 12, Date.UTC(2027, 10, 3)],
  ])('moves %d by %d months to %d', (from, months, expected) => {
    expect(addMonths(from, months)).toBe(expected);
  });
});

describe('durations', () => {
  it('are in milliseconds', () => {
    expect([minuteMs, hourMs, dayMs]).toEqual([60_000, 3_600_000, 86_400_000]);
  });
});
