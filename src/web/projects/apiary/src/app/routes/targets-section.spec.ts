import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { byLabel, byRole, choose, queryByRole, settle, textOf, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RouteModel, emptyRoute } from './route-model';
import { routeRules } from './route-rules';
import { TargetsSection } from './targets-section';

@Component({
  imports: [TargetsSection],
  template: `<ap-targets-section [route]="route" />`,
})
class Host {
  readonly model = signal<RouteModel>(emptyRoute('project-1'));
  readonly route = form(
    this.model,
    routeRules(() => undefined),
  );
}

async function render(): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
    ],
  });
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  return fixture;
}

async function press(fixture: ComponentFixture<Host>, name: string): Promise<void> {
  byRole(fixture, 'button', name).click();
  await settle(fixture);
}

function targets(fixture: ComponentFixture<Host>) {
  return fixture.componentInstance
    .model()
    .targets.map(({ host, port, weight }) => ({ host, port, weight }));
}

describe('TargetsSection', () => {
  it('starts with one target and no weights', async () => {
    const fixture = await render();

    expect(queryByRole(fixture, 'button', 'Remove target 1')).toBeUndefined();
  });

  it('splits the traffic 90 to 10 when a second target is added', async () => {
    const fixture = await render();
    type(byLabel(fixture, 'Service or host'), 'shop-v1');
    await settle(fixture);

    await press(fixture, 'Add target');

    expect(targets(fixture)).toEqual([
      { host: 'shop-v1', port: 8080, weight: 90 },
      { host: '', port: 8080, weight: 10 },
    ]);
  });

  it('adds a third target with no traffic', async () => {
    const fixture = await render();
    await press(fixture, 'Add target');

    await press(fixture, 'Add target');

    expect(targets(fixture).map((t) => t.weight)).toEqual([90, 10, 0]);
  });

  it('shows how the traffic is split', async () => {
    const fixture = await render();
    type(byLabel(fixture, 'Service or host'), 'shop-v1');
    await settle(fixture);

    await press(fixture, 'Add target');

    expect(textOf(fixture)).toContain('shop-v1 90% · target 10%');
  });

  it('gives the last target all the traffic once the others are removed', async () => {
    const fixture = await render();
    await press(fixture, 'Add target');

    await press(fixture, 'Remove target 1');

    expect(targets(fixture)).toEqual([{ host: '', port: 8080, weight: 100 }]);
  });

  it('allows at most 10 targets', async () => {
    const fixture = await render();
    fixture.componentInstance.model.update((m) => ({
      ...m,
      targets: [...Array(10).keys()].map((n) => ({ host: `shop-${n}`, port: 8080, weight: 10 })),
    }));
    await settle(fixture);

    expect(queryByRole(fixture, 'button', 'Add target')).toBeUndefined();
  });

  it('asks for the canary’s name and value once a canary is chosen', async () => {
    const fixture = await render();
    await press(fixture, 'Add target');

    choose(byLabel<HTMLSelectElement>(fixture, 'Canary (optional)'), 'header');
    await settle(fixture);

    expect([byLabel(fixture, 'Name').value, byLabel(fixture, 'Value').value]).toEqual([
      'X-Canary',
      'true',
    ]);
  });

  it('names the last target as the canary', async () => {
    const fixture = await render();
    await press(fixture, 'Add target');

    type(byLabel(fixture, 'Service or host'), 'shop-v1');
    await settle(fixture);

    expect(textOf(fixture)).toContain(
      'Requests with this header or cookie always reach the last target',
    );
  });
});
