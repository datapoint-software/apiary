import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { byLabel, settle } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { MaintenanceSection } from './maintenance-section';
import { RouteModel, emptyRoute } from './route-model';
import { routeRules } from './route-rules';

@Component({
  imports: [MaintenanceSection],
  template: `<ap-maintenance-section
    [maintenance]="route.maintenance"
    [scheduled]="scheduled()"
  />`,
})
class Host {
  readonly model = signal<RouteModel>(emptyRoute('project-1'));
  readonly route = form(
    this.model,
    routeRules(() => undefined),
  );
  readonly scheduled = computed(() => this.model().maintenance.scheduled);
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

function controls(fixture: ComponentFixture<Host>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('input, textarea').length;
}

describe('MaintenanceSection', () => {
  it('shows only the switch until maintenance is scheduled', async () => {
    const fixture = await render();

    expect(controls(fixture)).toBe(1);
  });

  it('asks for the start, end and message once scheduled', async () => {
    const fixture = await render();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')?.click();
    await settle(fixture);

    expect([
      byLabel(fixture, 'Starts').placeholder,
      byLabel(fixture, 'Ends').placeholder,
      byLabel<HTMLTextAreaElement>(fixture, 'Message for visitors (optional)').rows,
    ]).toEqual(['YYYY-MM-DD HH:MM', 'YYYY-MM-DD HH:MM', 2]);
  });
});
