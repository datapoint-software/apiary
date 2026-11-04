export const minuteMs = 60_000;
export const hourMs = 60 * minuteMs;
export const dayMs = 24 * hourMs;

const pattern = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseUtc(text: string, withTime = true): number | null {
  const match = pattern.exec(text.trim());
  if (!match || (match[4] !== undefined) !== withTime) {
    return null;
  }
  const [year, month, day, hour, minute] = match.slice(1).map((part) => Number(part ?? 0));
  return isRealDate(year, month, day, hour, minute) ? Date.UTC(year, month - 1, day, hour, minute) : null;
}

function isRealDate(year: number, month: number, day: number, hour: number, minute: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1970 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && hour < 24 && minute < 60;
}

export function formatUtc(ms: number, withTime = true): string {
  const date = new Date(ms);
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  return withTime ? `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` : day;
}

export function dayStart(ms: number): number {
  return Math.floor(ms / dayMs) * dayMs;
}

export function addMonths(ms: number, months: number): number {
  const date = new Date(ms);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
}
