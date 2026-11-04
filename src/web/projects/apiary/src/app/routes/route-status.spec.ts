import { TestBed } from '@angular/core/testing';
import { I18n } from '@datapoint/apiary-ui';
import { RouteHealth } from '../api/models';
import { aRoute } from '../testing/builders';
import { needsAttention, routeStatus, upcomingMaintenance } from './route-status';

const now = Date.parse('2026-11-04T12:00:00Z');
const tonight = { start: '2026-11-04T22:00:00Z', end: '2026-11-05T02:00:00Z' };
const thisMorning = { start: '2026-11-04T10:00:00Z', end: '2026-11-04T14:00:00Z' };

describe('routeStatus', () => {
  it.each([
    ['healthy', 0, ['ok', 'Healthy']],
    ['degraded', 2, ['warn', '2 targets down']],
    ['degraded', 1, ['warn', '1 target down']],
    ['down', 2, ['critical', 'Route down']],
    ['unknown', 0, ['off', 'Not checked yet']],
  ] as const)('shows a %s route with %i targets down as %j', (health, targetsDown, expected) => {
    const route = aRoute({ health: health as RouteHealth, targetsDown });

    expect(routeStatus(route, TestBed.inject(I18n), now)).toEqual(expected);
  });

  it('shows a disabled route as disabled, whatever its health', () => {
    const route = aRoute({ disabled: true, health: 'down' });

    expect(routeStatus(route, TestBed.inject(I18n), now)).toEqual(['off', 'Disabled']);
  });

  it('shows a route in its maintenance window as in maintenance', () => {
    const route = aRoute({ maintenance: thisMorning, health: 'down' });

    expect(routeStatus(route, TestBed.inject(I18n), now)).toEqual(['info', 'In maintenance']);
  });

  it('shows its health before the maintenance window starts', () => {
    const route = aRoute({ maintenance: tonight });

    expect(routeStatus(route, TestBed.inject(I18n), now)).toEqual(['ok', 'Healthy']);
  });
});

describe('needsAttention', () => {
  it.each([
    ['down', true],
    ['degraded', true],
    ['healthy', false],
    ['unknown', false],
  ] as const)('for a %s route is %s', (health, expected) => {
    expect(needsAttention(aRoute({ health }))).toBe(expected);
  });

  it('is false for a disabled route that is down', () => {
    expect(needsAttention(aRoute({ health: 'down', disabled: true }))).toBe(false);
  });
});

describe('upcomingMaintenance', () => {
  it('gives the start of a window that hasn’t started', () => {
    expect(upcomingMaintenance(aRoute({ maintenance: tonight }), now)).toBe('2026-11-04 22:00');
  });

  it('is empty once the window started', () => {
    expect(upcomingMaintenance(aRoute({ maintenance: thisMorning }), now)).toBe('');
  });

  it('is empty without a window', () => {
    expect(upcomingMaintenance(aRoute(), now)).toBe('');
  });
});
