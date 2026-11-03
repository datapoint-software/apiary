const key = 'apiary.sidebarCollapsed';

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function saveCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(key, String(collapsed));
  } catch {
    return;
  }
}
