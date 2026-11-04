import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouteView } from '../api/models';
import { answerClusterStatus } from '../testing/backend';
import { aRoute } from '../testing/builders';
import { allByRole, byRole, settle } from '../testing/dom';
import { RouteActions } from './route-actions';
import { RouteRowActions } from './route-row-actions';

class RecordingRouteActions {
  readonly calls: [string, string[]][] = [];

  async enable(route: RouteView): Promise<boolean> {
    this.calls.push(['enable', [route.id]]);
    return true;
  }

  async disable(route: RouteView): Promise<boolean> {
    this.calls.push(['disable', [route.id]]);
    return true;
  }

  async purge(routes: readonly RouteView[]): Promise<boolean> {
    this.calls.push(['purge', routes.map((r) => r.id)]);
    return true;
  }

  async delete(route: RouteView): Promise<boolean> {
    this.calls.push(['delete', [route.id]]);
    return true;
  }
}

interface Rendered {
  readonly fixture: ComponentFixture<RouteRowActions>;
  readonly actions: RecordingRouteActions;
}

async function render(route: RouteView): Promise<Rendered> {
  const actions = new RecordingRouteActions();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RouteActions, useValue: actions },
    ],
  });
  const fixture = TestBed.createComponent(RouteRowActions);
  fixture.componentRef.setInput('route', route);
  fixture.detectChanges();
  await answerClusterStatus(TestBed.inject(HttpTestingController));
  await settle(fixture);
  return { fixture, actions };
}

describe('RouteRowActions', () => {
  it('offers to disable, purge and delete a route that caches', async () => {
    const { fixture } = await render(aRoute({ caching: true }));

    expect(allByRole(fixture, 'button')).toEqual([
      'Disable shop.example.com',
      'Purge the cache of shop.example.com',
      'Delete shop.example.com',
    ]);
  });

  it.each([
    [aRoute(), 'Disable shop.example.com', 'disable'],
    [aRoute({ disabled: true }), 'Enable shop.example.com', 'enable'],
    [aRoute({ caching: true }), 'Purge the cache of shop.example.com', 'purge'],
    [aRoute(), 'Delete shop.example.com', 'delete'],
  ] as [RouteView, string, string][])('runs %#: %s', async (route, button, action) => {
    const { fixture, actions } = await render(route);

    byRole(fixture, 'button', button).click();
    await settle(fixture);

    expect(actions.calls).toEqual([[action, ['route-1']]]);
  });
});
