import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n, TextParams } from './i18n';

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(text: string, params?: TextParams): string {
    return this.i18n.t(text, params);
  }
}
