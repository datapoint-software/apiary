import { DestroyRef, inject } from '@angular/core';

export const liveInterval = 15_000;

export function reloadEvery(resource: { reload(): boolean }, milliseconds = liveInterval): void {
  const timer = setInterval(() => resource.reload(), milliseconds);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
}
