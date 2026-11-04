import { ComponentType } from '@angular/cdk/portal';
import { Observable, of } from 'rxjs';

export interface OpenedDialog {
  readonly component: ComponentType<unknown>;
  readonly data: unknown;
}

export class ClosingDialog {
  readonly opened: OpenedDialog[] = [];
  private readonly result: unknown;

  constructor(result: unknown = undefined) {
    this.result = result;
  }

  open(
    component: ComponentType<unknown>,
    config: { readonly data?: unknown } = {},
  ): { readonly closed: Observable<unknown> } {
    this.opened.push({ component, data: config.data });
    return { closed: of(this.result) };
  }
}
