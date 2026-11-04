import { currentLanguage } from '@datapoint/apiary-ui';

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

function relative(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  return new Intl.RelativeTimeFormat(currentLanguage(), { numeric: 'auto' }).format(value, unit);
}

export function timeAgo(iso: string, now = Date.now()): string {
  const elapsed = now - Date.parse(iso);
  if (elapsed < minute) {
    return relative(0, 'second');
  }
  if (elapsed < hour) {
    return relative(-Math.floor(elapsed / minute), 'minute');
  }
  if (elapsed < day) {
    return relative(-Math.floor(elapsed / hour), 'hour');
  }
  return relative(-Math.floor(elapsed / day), 'day');
}

export function timeSince(iso: string, now = Date.now()): string {
  const elapsed = Math.max(0, now - Date.parse(iso));
  const format = (value: number, unit: string) => new Intl.NumberFormat(currentLanguage(), { style: 'unit', unit, unitDisplay: 'long' }).format(value);
  if (elapsed < hour) {
    return format(Math.max(1, Math.floor(elapsed / minute)), 'minute');
  }
  return elapsed < day ? format(Math.floor(elapsed / hour), 'hour') : format(Math.floor(elapsed / day), 'day');
}

export function timeUntil(iso: string, now = Date.now()): string {
  const remaining = Date.parse(iso) - now;
  if (remaining <= 0) {
    return currentLanguage() === 'pt-PT' ? 'expirado' : 'expired';
  }
  if (remaining < hour) {
    return relative(Math.max(1, Math.floor(remaining / minute)), 'minute');
  }
  if (remaining < day) {
    return relative(Math.floor(remaining / hour), 'hour');
  }
  return relative(Math.round(remaining / day), 'day');
}

export function utcDateTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}
