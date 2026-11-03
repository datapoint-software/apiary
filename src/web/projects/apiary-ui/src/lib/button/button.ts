import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

@Directive({
  selector: '[apButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly apButton = input<ButtonVariant | ''>('');
  readonly size = input<'default' | 'small'>('default');
  readonly iconOnly = input(false);

  protected readonly classes = computed(() => {
    const variant = this.apButton() || 'default';
    return [
      'ap-btn',
      variant === 'default' ? '' : `ap-btn-${variant}`,
      this.size() === 'small' ? 'ap-btn-sm' : '',
      this.iconOnly() ? 'ap-btn-icon' : '',
    ].filter(Boolean);
  });
}
