import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { byLabel, settle, textOf } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RequestSizeSection } from './request-size-section';
import { RouteModel, emptyRoute } from './route-model';
import { routeRules } from './route-rules';

@Component({
  imports: [RequestSizeSection],
  template: `<ap-request-size-section [route]="route" [defaultMegabytes]="5000" />`,
})
class Host {
  readonly model = signal<RouteModel>(emptyRoute('project-1', 5000));
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

async function choose(fixture: ComponentFixture<Host>, label: string): Promise<void> {
  const radio = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label')]
    .find((l) => l.textContent?.includes(label))
    ?.querySelector('input') as HTMLInputElement;
  radio.click();
  await settle(fixture);
}

describe('RequestSizeSection', () => {
  it('names the cluster default', async () => {
    const fixture = await render();

    expect(textOf(fixture)).toContain('Cluster default, 5 GB');
  });

  it('asks for a size only when the route sets its own', async () => {
    const fixture = await render();
    expect(() => byLabel(fixture, 'Largest request')).toThrow();

    await choose(fixture, 'Custom');

    expect(fixture.componentInstance.model().requestSize).toBe('custom');
    expect(byLabel(fixture, 'Largest request').value).toBe('5');
  });

  it('warns when a route without a limit is open to everyone', async () => {
    const fixture = await render();

    await choose(fixture, 'No limit');

    expect(textOf(fixture)).toContain('Anyone can upload any amount to this route');
  });

  it('doesn’t warn when the route only allows some addresses', async () => {
    const fixture = await render();
    fixture.componentInstance.model.update((m) => ({ ...m, allowedAddresses: '10.0.0.0/8' }));

    await choose(fixture, 'No limit');

    expect(textOf(fixture)).not.toContain('Anyone can upload any amount to this route');
  });
});
