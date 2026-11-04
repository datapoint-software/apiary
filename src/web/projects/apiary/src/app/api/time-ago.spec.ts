import { currentLanguage } from '@datapoint/apiary-ui';
import { timeAgo, timeSince, timeUntil, utcDateTime } from './time-ago';

const now = Date.parse('2026-11-04T12:00:00Z');
const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

function at(offset: number): string {
  return new Date(now + offset).toISOString();
}

afterEach(() => currentLanguage.set('en'));

describe('timeAgo', () => {
  it.each([
    [-30 * second, 'now'],
    [-5 * minute, '5 minutes ago'],
    [-3 * hour, '3 hours ago'],
    [-day, 'yesterday'],
    [-10 * day, '10 days ago'],
  ])('says %i ms ago is %j', (offset, expected) => {
    expect(timeAgo(at(offset), now)).toBe(expected);
  });

  it('speaks the current language', () => {
    currentLanguage.set('pt-PT');

    expect(timeAgo(at(-5 * minute), now)).toBe('há 5 minutos');
  });
});

describe('timeSince', () => {
  it.each([
    [-30 * second, '1 minute'],
    [-20 * minute, '20 minutes'],
    [-3 * hour, '3 hours'],
    [-2 * day, '2 days'],
  ])('says %i ms ago lasted %j', (offset, expected) => {
    expect(timeSince(at(offset), now)).toBe(expected);
  });
});

describe('timeUntil', () => {
  it.each([
    [-minute, 'expired'],
    [30 * second, 'in 1 minute'],
    [20 * minute, 'in 20 minutes'],
    [3 * hour, 'in 3 hours'],
    [2 * day, 'in 2 days'],
  ])('says %i ms from now is %j', (offset, expected) => {
    expect(timeUntil(at(offset), now)).toBe(expected);
  });

  it('says expired in Portuguese', () => {
    currentLanguage.set('pt-PT');

    expect(timeUntil(at(-minute), now)).toBe('expirado');
  });
});

describe('utcDateTime', () => {
  it('shows an ISO timestamp as a UTC date and time to the minute', () => {
    expect(utcDateTime('2026-11-04T09:05:59Z')).toBe('2026-11-04 09:05');
  });
});
