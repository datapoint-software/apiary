import { ChangeDetectionStrategy, Component, ElementRef, computed, contentChild, effect, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { CircleAlert } from 'lucide';
import { Icon } from '../icon/icon';
import { ErrorMessages } from '../messages/error-messages';
import { Form } from './form';

let nextId = 0;

@Component({
  selector: 'ap-field',
  imports: [Icon],
  templateUrl: './field.html',
  host: { class: 'ap-field', '[attr.data-invalid]': 'error() ? "" : null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  readonly label = input.required<string>();
  readonly field = input.required<FieldTree<unknown>>();
  readonly help = input('');
  readonly optional = input(false);
  readonly summaryLabel = input('');
  protected readonly id = `ap-field-${nextId++}`;
  private readonly messages = inject(ErrorMessages);
  private readonly form = inject(Form, { optional: true });
  private readonly control = contentChild(FormField, { read: ElementRef });

  protected readonly error = computed(() => {
    const state = this.field()();
    const isShown = state.touched() || (this.form?.attempted() ?? false);
    const [first] = state.errors();
    return isShown && first ? this.messages.describe(first.kind, (first as { params?: Record<string, unknown> }).params) : '';
  });

  constructor() {
    effect(() => this.describeControl());
    effect((onCleanup) => {
      const unregister = this.form?.register({
        field: this.field(),
        label: this.summaryLabel() || this.label(),
        id: this.id,
        element: () => this.control()?.nativeElement as HTMLElement | undefined,
      });
      onCleanup(() => unregister?.());
    });
  }

  private describeControl(): void {
    const element = this.control()?.nativeElement as HTMLElement | undefined;
    if (!element) {
      return;
    }
    element.id = this.id;
    element.setAttribute('aria-describedby', `${this.id}-help ${this.id}-error`);
    element.toggleAttribute('aria-invalid', this.error() !== '');
  }

  protected readonly alertIcon = CircleAlert;
}
