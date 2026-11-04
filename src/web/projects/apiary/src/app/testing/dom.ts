import { ComponentFixture } from '@angular/core/testing';

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalized(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function textOf(fixture: ComponentFixture<unknown>): string {
  return normalized(root(fixture).textContent);
}

export function byLabel<T extends HTMLElement = HTMLInputElement>(
  fixture: ComponentFixture<unknown>,
  label: string,
): T {
  const labels = [...root(fixture).querySelectorAll('label')];
  const found = labels.find((l) => normalized(l.textContent) === label);
  const labelled = found?.htmlFor ? root(fixture).querySelector<T>(`#${found.htmlFor}`) : null;
  const named = [...root(fixture).querySelectorAll<T>('input, select, textarea')].find(
    (e) => e.getAttribute('aria-label') === label,
  );
  const control = labelled ?? named;
  if (!control) {
    throw new Error(`No control labelled “${label}”`);
  }
  return control;
}

const implicitRoles: Readonly<Record<string, string>> = {
  button: 'button',
  link: 'a[href]',
  heading: 'h1, h2, h3, h4, h5, h6',
  checkbox: 'input[type="checkbox"]',
  combobox: 'select',
  option: 'option',
  row: 'tr',
};

function withRole(fixture: ComponentFixture<unknown>, role: string): HTMLElement[] {
  const implicit = implicitRoles[role];
  const selector = implicit ? `${implicit}, [role="${role}"]` : `[role="${role}"]`;
  return [...root(fixture).querySelectorAll<HTMLElement>(selector)];
}

function nameOf(element: HTMLElement): string {
  return normalized(element.getAttribute('aria-label') ?? element.textContent);
}

export function byRole<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  role: string,
  name: string,
): T {
  const found = withRole(fixture, role).find((e) => nameOf(e) === name);
  if (!found) {
    throw new Error(`No ${role} named “${name}”`);
  }
  return found as T;
}

export function queryByRole(
  fixture: ComponentFixture<unknown>,
  role: string,
  name: string,
): HTMLElement | undefined {
  return withRole(fixture, role).find((e) => nameOf(e) === name);
}

export function allByRole(fixture: ComponentFixture<unknown>, role: string): string[] {
  return withRole(fixture, role).map(nameOf);
}

export function errorOf(fixture: ComponentFixture<unknown>, label: string): string {
  const control = byLabel(fixture, label);
  const errorId = control
    .getAttribute('aria-describedby')
    ?.split(' ')
    .find((id) => id.endsWith('-error'));
  const error = errorId ? root(fixture).querySelector<HTMLElement>(`#${errorId}`) : null;
  return error && !error.hidden ? normalized(error.textContent) : '';
}

export function type(control: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

export function choose(control: HTMLSelectElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event('input'));
  control.dispatchEvent(new Event('change'));
}

export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

export function alertsOf(fixture: ComponentFixture<unknown>): string {
  return allByRole(fixture, 'alert').join(' ');
}

export function cellsOfRow(fixture: ComponentFixture<unknown>, containing: string): string[] {
  const rows = [...root(fixture).querySelectorAll('tbody tr')];
  const row = rows.find((r) => normalized(r.textContent).includes(containing));
  return row ? [...row.querySelectorAll('td')].map((cell) => normalized(cell.textContent)) : [];
}

export function definitionOf(fixture: ComponentFixture<unknown>, term: string): string {
  const terms = [...root(fixture).querySelectorAll('dt')];
  const found = terms.find((dt) => normalized(dt.textContent) === term);
  return normalized(found?.nextElementSibling?.textContent ?? null);
}
