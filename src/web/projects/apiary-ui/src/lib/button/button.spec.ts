import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button, ButtonVariant } from './button';

@Component({
  selector: 'ap-button-host',
  imports: [Button],
  template: `<button
    type="button"
    class="ap-toolbar-action"
    [apButton]="variant()"
    [size]="size()"
    [iconOnly]="iconOnly()"
  >
    Save route
  </button>`,
})
class ButtonHost {
  readonly variant = signal<ButtonVariant | ''>('');
  readonly size = signal<'default' | 'small'>('default');
  readonly iconOnly = signal(false);
}

async function render(change: (host: ButtonHost) => void = () => undefined): Promise<string[]> {
  const fixture = TestBed.createComponent(ButtonHost);
  change(fixture.componentInstance);
  await fixture.whenStable();
  return [...fixture.nativeElement.querySelector('button').classList];
}

describe('Button', () => {
  it('styles a plain button by default', async () => {
    expect(await render()).toEqual(['ap-toolbar-action', 'ap-btn']);
  });

  it.each<ButtonVariant>(['primary', 'ghost', 'danger'])('styles a %s button', async (variant) => {
    expect(await render((host) => host.variant.set(variant))).toContain(`ap-btn-${variant}`);
  });

  it('adds no variant class for the default variant', async () => {
    expect(await render((host) => host.variant.set('default'))).toEqual([
      'ap-toolbar-action',
      'ap-btn',
    ]);
  });

  it('styles a small button', async () => {
    expect(await render((host) => host.size.set('small'))).toContain('ap-btn-sm');
  });

  it('styles an icon-only button', async () => {
    expect(await render((host) => host.iconOnly.set(true))).toContain('ap-btn-icon');
  });

  it('keeps the classes the button already has', async () => {
    expect(await render((host) => host.variant.set('primary'))).toContain('ap-toolbar-action');
  });
});
