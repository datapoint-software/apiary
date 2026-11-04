import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { RoutePasswordView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { byLabel, byRole, queryByRole, settle, textOf } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { AccessSection } from './access-section';
import { RouteModel, emptyRoute, routeModel } from './route-model';
import { routeRules } from './route-rules';
import { aRoute } from '../testing/builders';

@Component({
  imports: [AccessSection],
  template: `<ap-access-section [route]="route" [current]="current()" [canWrite]="canWrite()" />`,
})
class Host {
  readonly current = input<RoutePasswordView>();
  readonly canWrite = input(true);
  readonly model = signal<RouteModel>(emptyRoute('project-1'));
  readonly route = form(
    this.model,
    routeRules(() => undefined),
  );
}

const current: RoutePasswordView = {
  setAt: '2026-11-04T10:00:00Z',
  setBy: 'Ana Silva',
  days: 30,
  message: 'Preview for Example Lda.',
  linkMadeAt: '2026-11-04T11:00:00Z',
};

async function render(password?: RoutePasswordView): Promise<ComponentFixture<Host>> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
    ],
  });
  const fixture = TestBed.createComponent(Host);
  if (password) {
    fixture.componentRef.setInput('current', password);
    fixture.componentInstance.model.set(routeModel(aRoute({ password })));
  }
  await settle(fixture);
  return fixture;
}

function password(fixture: ComponentFixture<Host>) {
  return fixture.componentInstance.model().password;
}

async function check(fixture: ComponentFixture<Host>, label: string): Promise<void> {
  const box = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label')]
    .find((l) => l.textContent?.includes(label))
    ?.querySelector('input') as HTMLInputElement;
  box.click();
  await settle(fixture);
}

describe('AccessSection', () => {
  afterEach(() => vi.useRealTimers());

  it('asks for a rate limit once requests are limited', async () => {
    const fixture = await render();

    await check(fixture, 'Limit requests per visitor');

    expect(byLabel(fixture, 'Rate limit').value).toBe('600');
  });

  it('suggests a generated password once a password is asked for', async () => {
    const fixture = await render();

    await check(fixture, 'Ask visitors for a password');

    expect(byLabel(fixture, 'Password').value).toMatch(/^[a-z]+(-[a-z]+){3}-\d{2}$/);
  });

  it('generates another password', async () => {
    const fixture = await render();
    await check(fixture, 'Ask visitors for a password');
    const first = byLabel(fixture, 'Password').value;

    byRole(fixture, 'button', 'Generate another').click();
    await settle(fixture);

    expect(byLabel(fixture, 'Password').value).not.toBe(first);
  });

  it('says when the current password was set, and by whom', async () => {
    const fixture = await render(current);

    expect(textOf(fixture)).toContain(
      'Password set 2 hours agoBy Ana Silva. Apiary keeps only a hash, so it can’t show it again.',
    );
  });

  it('says when the current password was set by someone unknown', async () => {
    const fixture = await render({ ...current, setBy: undefined });

    expect(textOf(fixture)).toContain(
      'Password set 2 hours agoApiary keeps only a hash, so it can’t show it again.',
    );
  });

  it('replaces the current password with a generated one', async () => {
    const fixture = await render(current);

    byRole(fixture, 'button', 'Set a new password…').click();
    await settle(fixture);

    expect([password(fixture).replace, password(fixture).newPassword.length > 0]).toEqual([
      true,
      true,
    ]);
  });

  it('says when the sign-in link was made', async () => {
    const fixture = await render(current);

    expect(textOf(fixture)).toContain('Sign-in link made 1 hour ago');
  });

  it('makes a new sign-in link when saved', async () => {
    const fixture = await render(current);

    byRole(fixture, 'button', 'Make a new link').click();
    await settle(fixture);

    expect([password(fixture).newLink, textOf(fixture)]).toEqual([
      true,
      expect.stringContaining('A new link is made when you save'),
    ]);
  });

  it('lets only writers replace the password', async () => {
    const fixture = await render(current);
    fixture.componentRef.setInput('canWrite', false);
    await settle(fixture);

    expect(byRole<HTMLButtonElement>(fixture, 'button', 'Set a new password…').disabled).toBe(true);
  });

  it('shows the message and how long visitors stay signed in', async () => {
    const fixture = await render(current);

    expect([
      byLabel(fixture, 'Message on the password page (optional)').value,
      byLabel<HTMLSelectElement>(fixture, 'Keep visitors signed in for').value,
    ]).toEqual(['Preview for Example Lda.', '30']);
  });

  it('hides the password settings when no password is asked for', async () => {
    const fixture = await render();

    expect(queryByRole(fixture, 'button', 'Generate another')).toBeUndefined();
  });
});
