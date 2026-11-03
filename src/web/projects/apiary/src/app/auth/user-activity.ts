import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, Service, inject } from '@angular/core';

const recently = 60_000;
const inputs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

@Service()
export class UserActivity {
  private last = Date.now();

  constructor() {
    const document = inject(DOCUMENT);
    for (const type of inputs) {
      document.addEventListener(type, () => (this.last = Date.now()), { capture: true, passive: true });
    }
  }

  isRecent(): boolean {
    return Date.now() - this.last < recently;
  }
}

export const backgroundRequests: HttpInterceptorFn = (request, next) =>
  inject(UserActivity).isRecent() ? next(request) : next(request.clone({ setHeaders: { 'X-Apiary-Background': '1' } }));
