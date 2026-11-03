const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export function timeAgo(iso: string, now = Date.now()): string {
  const elapsed = now - Date.parse(iso);
  if (elapsed < minute) {
    return 'just now';
  }
  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)} min ago`;
  }
  if (elapsed < day) {
    return `${Math.floor(elapsed / hour)} h ago`;
  }
  const days = Math.floor(elapsed / day);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
