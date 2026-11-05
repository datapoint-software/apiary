import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';
import { ProxyModel, proxyRules } from './proxy-rules';

interface Options {
  readonly others?: readonly string[];
  readonly isFull?: boolean;
}

function proxyForm(model: Partial<ProxyModel>, { others = [], isFull = false }: Options = {}): FieldTree<ProxyModel> {
  return TestBed.runInInjectionContext(() =>
    form(
      signal({ range: '10.20.30.0/24', note: '', ...model }),
      proxyRules(
        () => others,
        () => isFull,
      ),
    ),
  );
}

function kinds(field: FieldTree<unknown>): string[] {
  return field()
    .errors()
    .map((error) => error.kind);
}

describe('proxyRules', () => {
  it('accepts a range and a note', () => {
    const proxy = proxyForm({ range: ' 2400:cb00::/32 ', note: 'Cloudflare' });

    expect(proxy().errorSummary()).toEqual([]);
  });

  it.each(['', '   '])('asks for a range instead of %j', (range) => {
    expect(kinds(proxyForm({ range }).range)).toEqual(['required']);
  });

  it('refuses something that isn’t a range', () => {
    expect(kinds(proxyForm({ range: 'office' }).range)).toEqual(['ipRange.invalid']);
  });

  it.each(['0.0.0.0/0', '::/0'])('refuses %s, which trusts everyone', (range) => {
    expect(kinds(proxyForm({ range }).range)).toEqual(['trustedProxy.everything']);
  });

  it('refuses a range that is already on the list', () => {
    const proxy = proxyForm({ range: '10.20.30.0/24' }, { others: ['192.0.2.0/24', '10.20.30.0/24'] });

    expect(kinds(proxy.range)).toEqual(['trustedProxy.duplicate']);
  });

  it('accepts a range that only overlaps one on the list', () => {
    expect(kinds(proxyForm({ range: '10.20.30.0/25' }, { others: ['10.20.30.0/24'] }).range)).toEqual([]);
  });

  it('refuses another range once the list is full', () => {
    expect(kinds(proxyForm({}, { isFull: true }).range)).toEqual(['ipRange.tooMany']);
  });

  it('keeps notes to 100 characters', () => {
    const proxy = proxyForm({ note: 'a'.repeat(101) });

    expect([kinds(proxy.note), proxy.note().errors()[0]]).toEqual([['tooLong'], expect.objectContaining({ params: { max: 100 } })]);
  });
});
