import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiProblem } from '../field/api-problem';
import { Confirmation } from './confirmation';
import { Confirmer } from './confirmer';

interface Opened {
  readonly result: Promise<boolean>;
}

function aConfirmation(overrides: Partial<Confirmation> = {}): Confirmation {
  return {
    heading: 'Delete shop.example.com?',
    text: 'Visitors will get an error page.',
    confirm: 'Delete route',
    action: () => Promise.resolve(),
    ...overrides,
  };
}

function aProblem(code: string): ApiProblem {
  return { status: 409, code };
}

function never(): Promise<void> {
  return new Promise(() => undefined);
}

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

async function open(confirmation: Confirmation): Promise<Opened> {
  const result = TestBed.inject(Confirmer).confirm(confirmation);
  await settle();
  return { result };
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.ap-dialog');
}

function button(name: string): HTMLButtonElement {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.ap-dialog button')];
  const found = buttons.find((candidate) => candidate.textContent?.trim() === name);
  if (!found) {
    throw new Error(`No button named ${name}`);
  }
  return found;
}

function confirmationInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('.ap-dialog input');
  if (!input) {
    throw new Error('No confirmation input');
  }
  return input;
}

async function click(name: string): Promise<void> {
  button(name).click();
  await settle();
}

async function type(text: string): Promise<void> {
  const input = confirmationInput();
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await settle();
}

describe('Confirmer', () => {
  it('shows an alert dialog', async () => {
    await open(aConfirmation());

    expect(dialog()?.getAttribute('role')).toBe('alertdialog');
  });

  it('names the dialog by its heading', async () => {
    await open(aConfirmation());

    const name = document.getElementById(dialog()?.getAttribute('aria-labelledby') ?? '');
    expect(name?.textContent?.trim()).toBe('Delete shop.example.com?');
  });

  it('describes the dialog by its text', async () => {
    await open(aConfirmation());

    const description = document.getElementById(dialog()?.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent?.trim()).toBe('Visitors will get an error page.');
  });

  it('resolves true once the action succeeds', async () => {
    const { result } = await open(aConfirmation());

    await click('Delete route');

    await expect(result).resolves.toBe(true);
  });

  it('runs the action when confirmed', async () => {
    const runs: string[] = [];
    await open(aConfirmation({ action: async () => void runs.push('deleted') }));

    await click('Delete route');

    expect(runs).toEqual(['deleted']);
  });

  it('closes once the action succeeds', async () => {
    const { result } = await open(aConfirmation());

    await click('Delete route');
    await result;
    await settle();

    expect(dialog()).toBeNull();
  });

  it('resolves false when cancelled', async () => {
    const { result } = await open(aConfirmation());

    await click('Cancel');

    await expect(result).resolves.toBe(false);
  });

  it('does not run the action when cancelled', async () => {
    const runs: string[] = [];
    await open(aConfirmation({ action: async () => void runs.push('deleted') }));

    await click('Cancel');

    expect(runs).toEqual([]);
  });

  it('shows the message for the problem’s code when the action fails', async () => {
    await open(aConfirmation({ action: () => Promise.reject(aProblem('cluster.noQuorum')) }));

    await click('Delete route');

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain(
      'Changes are paused while the cluster can’t reach a majority of voters.',
    );
  });

  it('stays open when the action fails', async () => {
    await open(aConfirmation({ action: () => Promise.reject(aProblem('cluster.noQuorum')) }));

    await click('Delete route');

    expect(dialog()).not.toBeNull();
  });

  it('says the server didn’t answer when the action fails without a problem', async () => {
    await open(aConfirmation({ action: () => Promise.reject(new TypeError('Failed to fetch')) }));

    await click('Delete route');

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain(
      'Apiary didn’t answer.',
    );
  });

  it('shows the busy text while the action runs', async () => {
    await open(aConfirmation({ busy: 'Deleting…', action: never }));

    await click('Delete route');

    expect(button('Deleting…').disabled).toBe(true);
  });

  it('shows a generic busy text when none is given', async () => {
    await open(aConfirmation({ action: never }));

    await click('Delete route');

    expect(button('Working…').disabled).toBe(true);
  });

  it('ignores cancel while the action runs', async () => {
    await open(aConfirmation({ action: never }));
    await click('Delete route');

    await click('Cancel');

    expect(dialog()).not.toBeNull();
  });

  it('blocks confirming until the name is typed', async () => {
    await open(aConfirmation({ typeToConfirm: 'shop.example.com' }));

    await type('shop.example');

    expect(button('Delete route').disabled).toBe(true);
  });

  it('allows confirming once the name is typed', async () => {
    await open(aConfirmation({ typeToConfirm: 'shop.example.com' }));

    await type(' shop.example.com ');

    expect(button('Delete route').disabled).toBe(false);
  });

  it('labels the confirmation input with the text to type', async () => {
    await open(aConfirmation({ typeToConfirm: 'shop.example.com' }));

    expect(confirmationInput().labels?.[0].textContent).toContain('shop.example.com');
  });

  it('shows a warning mark for a dangerous action', async () => {
    await open(aConfirmation());

    expect(dialog()?.querySelector('.ap-dialog-mark')).not.toBeNull();
  });

  it('shows no warning mark for a primary action', async () => {
    await open(aConfirmation({ tone: 'primary' }));

    expect(dialog()?.querySelector('.ap-dialog-mark')).toBeNull();
  });

  it('resolves false when Escape is pressed', async () => {
    const { result } = await open(aConfirmation());

    dialog()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await settle();

    await expect(result).resolves.toBe(false);
  });
});
