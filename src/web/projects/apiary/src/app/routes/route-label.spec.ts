import { TestBed } from '@angular/core/testing';
import { I18n } from '@datapoint/apiary-ui';
import { aRoute } from '../testing/builders';
import { routeLabel, targetLabel } from './route-label';

describe('routeLabel', () => {
  it('is the hostname alone for the root path', () => {
    expect(routeLabel({ host: 'shop.example.com', path: '/' })).toBe('shop.example.com');
  });

  it('adds any other path to the hostname', () => {
    expect(routeLabel({ host: 'shop.example.com', path: '/cart' })).toBe('shop.example.com/cart');
  });
});

describe('targetLabel', () => {
  it('shows a single target as host and port', () => {
    const route = aRoute({ targets: [{ host: 'shop-v1', port: 8080, weight: 100 }] });

    expect(targetLabel(route, TestBed.inject(I18n))).toBe('shop-v1:8080');
  });

  it('shows the split between several targets', () => {
    const route = aRoute({
      targets: [
        { host: 'shop-v1', port: 8080, weight: 90 },
        { host: 'shop-v2', port: 8080, weight: 10 },
      ],
    });

    expect(targetLabel(route, TestBed.inject(I18n))).toBe('shop-v1 90% · shop-v2 10%');
  });

  it('mentions a canary', () => {
    const route = aRoute({
      targets: [
        { host: 'shop-v1', port: 8080, weight: 90 },
        { host: 'shop-v2', port: 8080, weight: 10 },
      ],
      canary: { source: 'header', name: 'X-Canary', value: 'true' },
    });

    expect(targetLabel(route, TestBed.inject(I18n))).toBe('shop-v1 90% · shop-v2 10% · canary');
  });
});
