import { aTrustedProxy } from '../testing/builders';
import { isQuiet } from './proxy-activity';

const now = Date.parse('2026-11-04T12:00:00Z');

describe('isQuiet', () => {
  it.each([
    [null, true],
    ['2026-11-04T11:59:00Z', false],
    ['2026-11-03T12:00:00Z', false],
    ['2026-11-03T11:59:00Z', true],
  ])('a proxy whose last request was at %s is quiet: %s', (lastRequestAt, quiet) => {
    expect(isQuiet(aTrustedProxy({ lastRequestAt }), now)).toBe(quiet);
  });
});
