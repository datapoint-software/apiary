import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouteView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { answerClusterStatus } from '../testing/backend';
import { aRoute, aSignedInUser } from '../testing/builders';
import { byRole, settle } from '../testing/dom';
import { RouteActions } from './route-actions';
import { RouteDangerZone } from './route-danger-zone';

class RecordingRouteActions {
  readonly calls: [string, string][] = [];

  constructor(private readonly outcome: boolean) {}

  async enable(route: RouteView): Promise<boolean> {
    this.calls.push(['enable', route.id]);
    return this.outcome;
  }

  async disable(route: RouteView): Promise<boolean> {
    this.calls.push(['disable', route.id]);
    return this.outcome;
  }

  async delete(route: RouteView): Promise<boolean> {
    this.calls.push(['delete', route.id]);
    return this.outcome;
  }
}

interface Rendered {
  readonly fixture: ComponentFixture<RouteDangerZone>;
  readonly actions: RecordingRouteActions;
  readonly deleted: number[];
}

async function render(
  route: RouteView = aRoute(),
  role: Role = 'operator',
  outcome = true,
): Promise<Rendered> {
  const actions = new RecordingRouteActions(outcome);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RouteActions, useValue: actions },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(RouteDangerZone);
  fixture.componentRef.setInput('route', route);
  const deleted: number[] = [];
  fixture.componentInstance.deleted.subscribe(() => deleted.push(1));
  fixture.detectChanges();
  await answerClusterStatus(TestBed.inject(HttpTestingController));
  await settle(fixture);
  return { fixture, actions, deleted };
}

async function press({ fixture }: Rendered, name: string): Promise<void> {
  byRole(fixture, 'button', name).click();
  await settle(fixture);
}

describe('RouteDangerZone', () => {
  it('disables an enabled route', async () => {
    const zone = await render();

    await press(zone, 'Disable route…');

    expect(zone.actions.calls).toEqual([['disable', 'route-1']]);
  });

  it('enables a disabled route', async () => {
    const zone = await render(aRoute({ disabled: true }));

    await press(zone, 'Enable route');

    expect(zone.actions.calls).toEqual([['enable', 'route-1']]);
  });

  it('tells the page once the route is deleted', async () => {
    const zone = await render();

    await press(zone, 'Delete route…');

    expect([zone.actions.calls, zone.deleted]).toEqual([[['delete', 'route-1']], [1]]);
  });

  it('stays when deleting is cancelled', async () => {
    const zone = await render(aRoute(), 'operator', false);

    await press(zone, 'Delete route…');

    expect(zone.deleted).toEqual([]);
  });

  it('lets a viewer change nothing', async () => {
    const { fixture } = await render(aRoute(), 'viewer');

    expect([
      byRole<HTMLButtonElement>(fixture, 'button', 'Disable route…').disabled,
      byRole<HTMLButtonElement>(fixture, 'button', 'Delete route…').disabled,
    ]).toEqual([true, true]);
  });
});
