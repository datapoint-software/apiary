import { schema, validate } from '@angular/forms/signals';
import { ipRange } from '@datapoint/apiary-ui';
import { IpNetwork, isSameRange, parseRange } from './ip-address';

export const maximumProxies = 100;
export const maximumNoteLength = 100;

export interface ProxyModel {
  range: string;
  note: string;
}

function rangeError(value: string, others: readonly string[]): string | null {
  const range = parseRange(value);
  if (range === null) {
    return null;
  }
  if (range.prefix === 0) {
    return 'trustedProxy.everything';
  }
  const listed = others.map(parseRange).filter((other): other is IpNetwork => other !== null);
  return listed.some((other) => isSameRange(other, range)) ? 'trustedProxy.duplicate' : null;
}

export const proxyRules = (others: () => readonly string[], isFull: () => boolean) =>
  schema<ProxyModel>((proxy) => {
    validate(proxy.range, () => (isFull() ? { kind: 'ipRange.tooMany' } : undefined));
    validate(proxy.range, ({ value }) => (value().trim() ? undefined : { kind: 'required' }));
    ipRange(proxy.range);
    validate(proxy.range, ({ value }) => {
      const kind = rangeError(value(), others());
      return kind ? { kind } : undefined;
    });
    validate(proxy.note, ({ value }) =>
      value().trim().length > maximumNoteLength ? { kind: 'tooLong', params: { max: maximumNoteLength } } : undefined,
    );
  });
