import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, SchemaPath, form } from '@angular/forms/signals';
import {
  hostname,
  ipRanges,
  newPassword,
  port,
  sixDigitCode,
  target,
  utcDateTime,
  wholeNumber,
} from './rules';

function aField(value: string, rule: (path: SchemaPath<string>) => void): FieldTree<string> {
  return TestBed.runInInjectionContext(() => form(signal(value), rule));
}

function aNumberField(
  value: number | null,
  rule: (path: SchemaPath<number | null>) => void,
): FieldTree<number | null> {
  return TestBed.runInInjectionContext(() => form(signal(value), rule));
}

function kindsOf(field: FieldTree<unknown>): string[] {
  return field()
    .errors()
    .map((error) => error.kind);
}

function paramsOf(field: FieldTree<unknown>): unknown {
  return (field().errors()[0] as { params?: unknown }).params;
}

describe('hostname', () => {
  it('reports the hostname check code', () => {
    expect(kindsOf(aField('localhost', hostname))).toEqual(['hostname.notFull']);
  });

  it('passes a full hostname', () => {
    expect(kindsOf(aField('shop.example.com', hostname))).toEqual([]);
  });
});

describe('target', () => {
  it('reports the target check code', () => {
    expect(kindsOf(aField('127.0.0.1', target))).toEqual(['target.loopback']);
  });

  it('passes a service name', () => {
    expect(kindsOf(aField('shop-v1', target))).toEqual([]);
  });
});

describe('port', () => {
  it.each([[null], [Number.NaN]])('requires a port when the value is %s', (value) => {
    expect(kindsOf(aNumberField(value, port))).toEqual(['port.required']);
  });

  it.each([[0], [65536], [80.5]])('refuses %d as out of range', (value) => {
    expect(kindsOf(aNumberField(value, port))).toEqual(['range']);
  });

  it('gives the allowed range with the error', () => {
    expect(paramsOf(aNumberField(0, port))).toEqual({ min: 1, max: 65535 });
  });

  it.each([[1], [8080], [65535]])('passes %d', (value) => {
    expect(kindsOf(aNumberField(value, port))).toEqual([]);
  });
});

describe('wholeNumber', () => {
  const oneToTen = (path: SchemaPath<number | null>) => wholeNumber(path, 1, 10);

  it.each([[null], [0], [11], [2.5]])('refuses %s', (value) => {
    expect(kindsOf(aNumberField(value, oneToTen))).toEqual(['range']);
  });

  it('gives the allowed range with the error', () => {
    expect(paramsOf(aNumberField(11, oneToTen))).toEqual({ min: 1, max: 10 });
  });

  it.each([[1], [10]])('passes the bound %d', (value) => {
    expect(kindsOf(aNumberField(value, oneToTen))).toEqual([]);
  });
});

describe('ipRanges', () => {
  it('passes one range per line, ignoring blank lines and spaces', () => {
    expect(kindsOf(aField('10.0.0.0/8\n\n  2001:db8::/32  \n', ipRanges))).toEqual([]);
  });

  it('passes an empty list', () => {
    expect(kindsOf(aField('', ipRanges))).toEqual([]);
  });

  it('refuses the list when any line is not a range', () => {
    expect(kindsOf(aField('10.0.0.0/8\noffice\n192.0.2.0/24', ipRanges))).toEqual([
      'ipRange.invalid',
    ]);
  });
});

describe('newPassword', () => {
  it('reports the password check code', () => {
    expect(kindsOf(aField('short', newPassword))).toEqual(['password.tooShort']);
  });

  it('gives the length limits with the error', () => {
    expect(paramsOf(aField('short', newPassword))).toEqual({ min: 15, max: 256 });
  });

  it('checks against the email it is given', () => {
    const field = aField('maria.silva likes long passwords', (path: SchemaPath<string>) =>
      newPassword(path, () => 'maria.silva@example.com'),
    );

    expect(kindsOf(field)).toEqual(['password.containsEmail']);
  });

  it('passes a good password', () => {
    expect(kindsOf(aField('correct horse battery staple', newPassword))).toEqual([]);
  });
});

describe('sixDigitCode', () => {
  it.each([['123456'], ['123 456'], [' 123456 ']])('passes %j', (value) => {
    expect(kindsOf(aField(value, sixDigitCode))).toEqual([]);
  });

  it.each([[''], ['12345'], ['1234567'], ['12345a']])('refuses %j', (value) => {
    expect(kindsOf(aField(value, sixDigitCode))).toEqual(['code.format']);
  });
});

describe('utcDateTime', () => {
  it('passes a date and time', () => {
    expect(kindsOf(aField('2026-11-03 14:00', utcDateTime))).toEqual([]);
  });

  it('refuses a date without a time', () => {
    expect(kindsOf(aField('2026-11-03', utcDateTime))).toEqual(['dateTime.format']);
  });
});
