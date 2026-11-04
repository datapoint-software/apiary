import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, validate } from '@angular/forms/signals';
import { hostname } from '../rules/rules';
import { ApiProblem } from './api-problem';
import { ErrorSummary } from './error-summary';
import { Field } from './field';
import { Form } from './form';
import { problemErrors } from './problem-errors';

@Component({
  selector: 'ap-route-form',
  imports: [Form, Field, FormField, ErrorSummary],
  template: `
    <form [apForm]="route" #routeForm="apForm" (submit)="save(routeForm)">
      <ap-error-summary verb="save" />
      <ap-field label="Hostname" help="The name visitors type." [field]="route.hostname">
        <input [formField]="route.hostname" />
      </ap-field>
      <ap-field label="Path" summaryLabel="Route path" [optional]="true" [field]="route.path">
        <input [formField]="route.path" />
      </ap-field>
      <button type="submit">Save</button>
    </form>
  `,
})
class RouteForm {
  readonly problem = signal<ApiProblem | null>(null);
  readonly saved = signal(false);
  protected readonly route = form(signal({ hostname: '', path: '/' }), (path) => {
    hostname(path.hostname);
    validate(path.path, ({ value }) =>
      value().startsWith('/') ? undefined : { kind: 'path.invalid' },
    );
  });

  protected async save(routeForm: Form): Promise<void> {
    const saved = await routeForm.submit(async () => {
      const problem = this.problem();
      return problem ? problemErrors(problem, this.route) : undefined;
    });
    this.saved.set(saved);
  }
}

let fixture: ComponentFixture<RouteForm>;

async function render(): Promise<HTMLElement> {
  fixture = TestBed.createComponent(RouteForm);
  await settle();
  return fixture.nativeElement;
}

async function settle(): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

function input(label: string): HTMLInputElement {
  const labelElement = [...document.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  );
  return document.getElementById(labelElement?.htmlFor ?? '') as HTMLInputElement;
}

function describedBy(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .filter((text) => text !== '')
    .join(' | ');
}

function summary(): HTMLElement | null {
  return document.querySelector<HTMLElement>('ap-error-summary [role="alert"]');
}

function summaryLinks(): string[] {
  return [...document.querySelectorAll('ap-error-summary a')].map(
    (link) => link.textContent?.trim() ?? '',
  );
}

async function type(element: HTMLInputElement, text: string): Promise<void> {
  element.value = text;
  element.dispatchEvent(new Event('input'));
  await settle();
}

async function leave(element: HTMLInputElement): Promise<void> {
  element.dispatchEvent(new Event('blur'));
  await settle();
}

async function save(): Promise<void> {
  document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  await settle();
}

describe('Field', () => {
  it('labels its control', async () => {
    await render();

    expect(input('Hostname')).toBeInstanceOf(HTMLInputElement);
  });

  it('marks an optional field', async () => {
    await render();

    expect(input('Path').labels?.[0].textContent).toContain('(optional)');
  });

  it('describes its control with the help text', async () => {
    await render();

    expect(describedBy(input('Hostname'))).toBe('The name visitors type.');
  });

  it('shows no error before the field is left', async () => {
    await render();

    await type(input('Hostname'), 'localhost');

    expect(input('Hostname').hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the error once the field is left', async () => {
    await render();
    await type(input('Hostname'), 'localhost');

    await leave(input('Hostname'));

    expect(describedBy(input('Hostname'))).toBe(
      'The name visitors type. | Enter a full hostname, such as shop.example.com.',
    );
  });

  it('marks the control invalid once the field is left', async () => {
    await render();
    await type(input('Hostname'), 'localhost');

    await leave(input('Hostname'));

    expect(input('Hostname').getAttribute('aria-invalid')).toBe('true');
  });

  it('updates the error as you type after leaving the field', async () => {
    await render();
    await type(input('Hostname'), 'localhost');
    await leave(input('Hostname'));

    await type(input('Hostname'), 'shop..example.com');

    expect(describedBy(input('Hostname'))).toContain('check for two dots in a row');
  });

  it('clears the error once the value is fixed', async () => {
    await render();
    await type(input('Hostname'), 'localhost');
    await leave(input('Hostname'));

    await type(input('Hostname'), 'shop.example.com');

    expect(input('Hostname').hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows every field’s error once the form is submitted', async () => {
    await render();
    await type(input('Path'), 'cart');

    await save();

    expect(describedBy(input('Path'))).toBe(
      'Enter a path that starts with /, such as /api, without ? or #.',
    );
  });
});

describe('ErrorSummary', () => {
  it('stays hidden before the form is submitted', async () => {
    await render();
    await type(input('Path'), 'cart');

    expect(summary()).toBeNull();
  });

  it('counts the problems in its heading', async () => {
    await render();
    await type(input('Path'), 'cart');

    await save();

    expect(summary()?.querySelector('.ap-banner-title')?.textContent?.trim()).toBe(
      'Fix 2 problems to save',
    );
  });

  it('lists each problem with its field’s label, in the order of the fields', async () => {
    await render();
    await type(input('Path'), 'cart');

    await save();

    expect(summaryLinks()).toEqual([
      'Hostname: Enter a hostname, such as shop.example.com.',
      'Route path: Enter a path that starts with /, such as /api, without ? or #.',
    ]);
  });

  it('takes focus when the form is submitted with several problems', async () => {
    await render();
    await type(input('Path'), 'cart');

    await save();

    expect(document.activeElement).toBe(summary());
  });

  it('moves focus to the field when its problem is followed', async () => {
    await render();
    await type(input('Path'), 'cart');
    await save();

    document.querySelectorAll<HTMLAnchorElement>('ap-error-summary a')[1].click();

    expect(document.activeElement).toBe(input('Path'));
  });

  it('stays hidden when only one field has a problem', async () => {
    await render();

    await save();

    expect(summary()).toBeNull();
  });

  it('moves focus to the only field with a problem', async () => {
    await render();

    await save();

    expect(document.activeElement).toBe(input('Hostname'));
  });

  it('lists a server problem that belongs to no field', async () => {
    await render();
    await type(input('Hostname'), 'shop.example.com');
    fixture.componentInstance.problem.set({ status: 503, code: 'cluster.noQuorum' });

    await save();

    expect(summaryLinks()).toEqual([
      'Changes are paused while the cluster can’t reach a majority of voters. Try again once it recovers.',
    ]);
  });

  it('puts a server problem for a field on that field', async () => {
    await render();
    await type(input('Hostname'), 'shop.example.com');
    fixture.componentInstance.problem.set({
      status: 400,
      code: 'request.invalid',
      errors: [{ field: 'hostname', code: 'hostname.address' }],
    });

    await save();

    expect(describedBy(input('Hostname'))).toContain('Use a hostname, not an IP address');
  });

  it('lets a valid form be saved', async () => {
    await render();
    await type(input('Hostname'), 'shop.example.com');

    await save();

    expect(fixture.componentInstance.saved()).toBe(true);
  });
});
