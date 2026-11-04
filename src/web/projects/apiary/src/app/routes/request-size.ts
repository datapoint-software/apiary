import { SchemaPath, validate } from '@angular/forms/signals';
import { currentLanguage } from '@datapoint/apiary-ui';

export type RequestSizeLimit = 'default' | 'custom' | 'unlimited';
export type SizeUnit = 'MB' | 'GB';

export interface RequestSizeModel {
  amount: number | null;
  unit: SizeUnit;
}

const megabytesPerGigabyte = 1000;
const maximumMegabytes = 100000;

export function toMegabytes(size: RequestSizeModel): number | null {
  return size.amount === null ? null : size.amount * (size.unit === 'GB' ? megabytesPerGigabyte : 1);
}

export function sizeModel(megabytes: number): RequestSizeModel {
  const isWholeGigabytes = megabytes >= megabytesPerGigabyte && megabytes % megabytesPerGigabyte === 0;
  return isWholeGigabytes ? { amount: megabytes / megabytesPerGigabyte, unit: 'GB' } : { amount: megabytes, unit: 'MB' };
}

export function formatSize(megabytes: number): string {
  const { amount, unit } = sizeModel(megabytes);
  return `${new Intl.NumberFormat(currentLanguage()).format(amount ?? 0)} ${unit}`;
}

export function requestSize(amount: SchemaPath<number | null>, unit: SchemaPath<SizeUnit>): void {
  validate(amount, ({ value, valueOf }) => {
    const megabytes = toMegabytes({ amount: value(), unit: valueOf(unit) });
    const isInRange = megabytes !== null && Number.isInteger(value()) && megabytes >= 1 && megabytes <= maximumMegabytes;
    return isInRange ? undefined : { kind: 'route.requestSize' };
  });
}
