import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, viewChild } from '@angular/core';
import { CircleAlert } from 'lucide';
import { I18n } from '../i18n/i18n';
import { Icon } from '../icon/icon';
import { ErrorMessages } from '../messages/error-messages';
import { Form } from './form';

interface SummaryItem {
  readonly key: string;
  readonly text: string;
  readonly hasField: boolean;
  readonly order: number;
  readonly focus: () => void;
}

@Component({
  selector: 'ap-error-summary',
  imports: [Icon],
  templateUrl: './error-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorSummary {
  readonly verb = input('continue');
  protected readonly form = inject(Form);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner');
  protected readonly icon = CircleAlert;

  protected readonly items = computed<readonly SummaryItem[]>(() => {
    if (!this.form.attempted()) {
      return [];
    }
    const fields = this.form.fields();
    const errors = this.form.apForm()().errorSummary();
    return errors
      .map((error, index) => {
        const registration = fields.find((f) => f.field === error.fieldTree);
        const text = this.messages.describe(error.kind, (error as { params?: Record<string, unknown> }).params);
        return {
          key: `${index}-${error.kind}`,
          text: registration ? `${registration.label}: ${text}` : text,
          hasField: registration !== undefined,
          order: registration ? fields.indexOf(registration) : -1,
          focus: () => error.fieldTree().focusBoundControl(),
        };
      })
      .sort((a, b) => a.order - b.order);
  });

  protected readonly isShown = computed(() => this.items().length > 1 || this.items().some((item) => !item.hasField));

  protected readonly heading = computed(() => {
    const verb = this.i18n.t(this.verb());
    return this.i18n.plural(this.items().length, 'Fix {count} problem to {verb}', 'Fix {count} problems to {verb}', { verb });
  });

  constructor() {
    effect(() => {
      if (this.form.summaryFocus() > 0) {
        queueMicrotask(() => this.banner()?.nativeElement.focus());
      }
    });
  }

  protected go(event: Event, item: SummaryItem): void {
    event.preventDefault();
    item.focus();
  }
}
