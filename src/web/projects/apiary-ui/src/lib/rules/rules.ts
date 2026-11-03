import { SchemaPath, validate } from '@angular/forms/signals';
import { checkNewPassword } from '../password/password-check';
import { checkHostname } from './hostname-check';
import { checkIpRange } from './ip-range-check';
import { checkTarget } from './target-check';
import { parseUtc } from '../date-time/utc-date';

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

export function newPassword(path: SchemaPath<string>, email: () => string = () => ''): void {
  validate(path, ({ value }) => asError(checkNewPassword(value(), email()), { min: 15, max: 256 }));
}

export function sixDigitCode(path: SchemaPath<string>): void {
  validate(path, ({ value }) => (/^\d{6}$/.test(value().replace(/\s/g, '')) ? undefined : { kind: 'code.format' }));
}

export function utcDateTime(path: SchemaPath<string>): void {
  validate(path, ({ value }) => (parseUtc(value()) === null ? { kind: 'dateTime.format' } : undefined));
}
