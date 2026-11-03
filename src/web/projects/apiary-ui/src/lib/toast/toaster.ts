import { Service, signal } from '@angular/core';
import { Toast, ToastAction, ToastTone } from './toast';

interface ToastOptions {
  readonly tone?: ToastTone;
  readonly heading?: string;
  readonly action?: ToastAction;
}

@Service()
export class Toaster {
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<readonly Toast[]>([]);

  show(text: string, options: ToastOptions = {}): void {
    const toast: Toast = { id: this.nextId++, text, tone: options.tone ?? 'ok', heading: options.heading, action: options.action };
    this.toasts.update((list) => [...list, toast]);
    this.arm(toast);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  pause(id: number): void {
    clearTimeout(this.timers.get(id));
  }

  resume(id: number): void {
    const toast = this.toasts().find((t) => t.id === id);
    if (toast) {
      this.arm(toast);
    }
  }

  private arm(toast: Toast): void {
    if (toast.tone === 'error') {
      return;
    }
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), toast.action ? 8000 : 5000));
  }
}
