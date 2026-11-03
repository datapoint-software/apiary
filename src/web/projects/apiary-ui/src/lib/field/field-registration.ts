import { FieldTree } from '@angular/forms/signals';

export interface FieldRegistration {
  readonly field: FieldTree<unknown>;
  readonly label: string;
  readonly id: string;
  readonly element: () => HTMLElement | undefined;
}
