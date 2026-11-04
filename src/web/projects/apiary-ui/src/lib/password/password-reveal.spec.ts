import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { currentLanguage } from '../i18n/language';
import { PasswordReveal } from './password-reveal';

@Component({
  selector: 'ap-password-reveal-host',
  imports: [PasswordReveal],
  template: `<input type="password" aria-label="Password" #password />
    <ap-password-reveal [target]="password" [label]="label()" />`,
})
class PasswordRevealHost {
  readonly label = signal<string | undefined>(undefined);
}

interface Rendered {
  readonly input: HTMLInputElement;
  readonly button: HTMLButtonElement;
  readonly toggle: () => Promise<void>;
}

async function render(label?: string): Promise<Rendered> {
  const fixture = TestBed.createComponent(PasswordRevealHost);
  fixture.componentInstance.label.set(label);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const button = element.querySelector('button') as HTMLButtonElement;
  return {
    input: element.querySelector('input') as HTMLInputElement,
    button,
    toggle: async () => {
      button.click();
      await fixture.whenStable();
    },
  };
}

describe('PasswordReveal', () => {
  afterEach(() => currentLanguage.set('en'));

  it('starts with the password hidden', async () => {
    const { input, button } = await render();

    expect([input.type, button.getAttribute('aria-pressed'), button.textContent?.trim()]).toEqual([
      'password',
      'false',
      'Show',
    ]);
  });

  it('names the button after the password', async () => {
    const { button } = await render();

    expect(button.getAttribute('aria-label')).toBe('Show password');
  });

  it('shows the password when pressed', async () => {
    const { input, toggle } = await render();

    await toggle();

    expect(input.type).toBe('text');
  });

  it('reports that it is pressed once the password shows', async () => {
    const { button, toggle } = await render();

    await toggle();

    expect([button.getAttribute('aria-pressed'), button.getAttribute('aria-label')]).toEqual([
      'true',
      'Hide password',
    ]);
  });

  it('hides the password again when pressed twice', async () => {
    const { input, toggle } = await render();
    await toggle();

    await toggle();

    expect(input.type).toBe('password');
  });

  it('names the button after the label it is given', async () => {
    const { button } = await render('new password');

    expect(button.getAttribute('aria-label')).toBe('Show new password');
  });

  it('names the button in Portuguese', async () => {
    currentLanguage.set('pt-PT');

    const { button } = await render();

    expect(button.getAttribute('aria-label')).toBe('Mostrar palavra-passe');
  });
});
