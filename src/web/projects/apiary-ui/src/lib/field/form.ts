import { Directive, computed, input, signal } from '@angular/core';
import { FieldTree, TreeValidationResult, submit } from '@angular/forms/signals';
import { FieldRegistration } from './field-registration';

@Directive({
  selector: 'form[apForm]',
  host: { novalidate: '', '(submit)': '$event.preventDefault()' },
  exportAs: 'apForm',
})
export class Form {
  readonly apForm = input.required<FieldTree<unknown>>();
  readonly attempted = signal(false);
  readonly summaryFocus = signal(0);
  private readonly registrations = signal<readonly FieldRegistration[]>([]);
  readonly fields = computed(() => this.registrations());

  register(registration: FieldRegistration): () => void {
    this.registrations.update((list) => [...list, registration]);
    return () => this.registrations.update((list) => list.filter((r) => r !== registration));
  }

  async submit(action: () => Promise<TreeValidationResult>): Promise<boolean> {
    this.attempted.set(true);
    const saved = await submit(this.apForm(), { action: () => action() });
    if (!saved) {
      this.revealProblems();
    }
    return saved;
  }

  revealProblems(): void {
    const errors = this.apForm()().errorSummary();
    if (errors.length === 1 && errors[0].fieldTree !== this.apForm()) {
      errors[0].fieldTree().focusBoundControl();
      return;
    }
    this.summaryFocus.update((n) => n + 1);
  }
}
