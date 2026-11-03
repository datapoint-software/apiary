import { SchemaPath, validate } from '@angular/forms/signals';
import { checkHostname } from './hostname-check';
import { checkIpRange } from './ip-range-check';
import { checkTarget } from './target-check';

function asError(code: string | null, params?: Record<string, unknown>) {
  return code ? { kind: code, params } : undefined;
}

export function hostname(path: SchemaPath<string>): void {
  validate(path, ({ value }) => asError(checkHostname(value())));
}

export function target(path: SchemaPath<string>): void {
  validate(path, ({ value }) => asError(checkTarget(value())));
}

export function port(path: SchemaPath<number | null>): void {
  validate(path, ({ value }) => {
    const port = value();
    if (port === null || Number.isNaN(port)) {
      return { kind: 'port.required' };
    }
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? undefined : { kind: 'range', params: { min: 1, max: 65535 } };
  });
}

export function wholeNumber(path: SchemaPath<number | null>, min: number, max: number): void {
  validate(path, ({ value }) => {
    const number = value();
    const isInRange = number !== null && Number.isInteger(number) && number >= min && number <= max;
    return isInRange ? undefined : { kind: 'range', params: { min, max } };
  });
}

export function ipRanges(path: SchemaPath<string>): void {
  validate(path, ({ value }) => {
    const lines = value().split('\n').map((line) => line.trim()).filter(Boolean);
    return asError(lines.map(checkIpRange).find((code) => code !== null) ?? null);
  });
}
