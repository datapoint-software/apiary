import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';
import { Field } from './field';
import { FieldHelp } from './field-help';

@Component({
  imports: [Field, FieldHelp, FormField],
  template: `
    <ap-field label="Allowed addresses" help="One per line." [field]="access.allowed">
      <textarea [formField]="access.allowed"></textarea>
      <span apFieldHelp>Behind a <a href="#/trusted-proxies">trusted proxy</a>, it checks X-Forwarded-For.</span>
    </ap-field>
    <ap-field label="Note" [field]="access.note">
      <span apFieldHelp>Shown to <a href="#/users">administrators</a>.</span>
      <input [formField]="access.note" />
    </ap-field>
  `,
})
class AccessForm {
  protected readonly access = form(signal({ allowed: '', note: '' }));
}

function control(label: string): HTMLElement {
  const labelElement = [...document.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  );
  return document.getElementById(labelElement?.htmlFor ?? '') as HTMLElement;
}

function describedBy(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .filter((text) => text !== '')
    .join(' | ');
}

async function renderAccess(): Promise<void> {
  const access = TestBed.createComponent(AccessForm);
  await access.whenStable();
}

describe('FieldHelp', () => {
  it('describes its control with the help text and the help content', async () => {
    await renderAccess();

    expect(describedBy(control('Allowed addresses'))).toBe(
      'One per line. Behind a trusted proxy, it checks X-Forwarded-For.',
    );
  });

  it('keeps links in the help content', async () => {
    await renderAccess();

    const help = document.getElementById(`${control('Allowed addresses').id}-help`);

    expect(help?.querySelector('a')?.getAttribute('href')).toBe('#/trusted-proxies');
  });

  it('describes its control with help content alone', async () => {
    await renderAccess();

    expect(describedBy(control('Note'))).toBe('Shown to administrators.');
  });
});
