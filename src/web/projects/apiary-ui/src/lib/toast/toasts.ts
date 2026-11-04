import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CircleAlert, CircleCheck, Info, X } from 'lucide';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Toast } from './toast';
import { Toaster } from './toaster';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'ap-toasts',
  imports: [Icon, Button, TranslatePipe],
  templateUrl: './toasts.html',
  host: { class: 'ap-toasts', 'aria-live': 'polite' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toasts {
  protected readonly toaster = inject(Toaster);
  protected readonly icons = { ok: CircleCheck, error: CircleAlert, info: Info };
  protected readonly close = X;

  protected release(id: number, event: MouseEvent | FocusEvent): void {
    const toast = event.currentTarget as HTMLElement;
    const focused = event instanceof FocusEvent ? event.relatedTarget : document.activeElement;
    const hovered = event instanceof FocusEvent && toast.matches(':hover');
    if (!hovered && !(focused instanceof Node && toast.contains(focused))) {
      this.toaster.resume(id);
    }
  }

  protected act(toast: Toast): void {
    this.toaster.dismiss(toast.id);
    toast.action?.run();
  }
}
