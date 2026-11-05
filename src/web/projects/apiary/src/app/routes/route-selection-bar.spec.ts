import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouteView } from '../api/models';
import { answerClusterStatus } from '../testing/backend';
import { aRoute } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, settle, textOf } from '../testing/dom';
import { MoveRoutesDialog } from './move-routes-dialog';
import { RouteActions } from './route-actions';
import { RouteSelectionBar } from './route-selection-bar';

class ChosenRouteActions {
  readonly purged: (readonly RouteView[])[] = [];
  readonly deleted: (readonly RouteView[])[] = [];

  constructor(private readonly outcome: boolean) {}

  async purge(routes: readonly RouteView[]): Promise<boolean> {
    this.purged.push(routes);
    return this.outcome;
  }

  async deleteMany(routes: readonly RouteView[]): Promise<boolean> {
    this.deleted.push(routes);
    return this.outcome;
  }
}

const routes = [aRoute({ id: 'route-1' }), aRoute({ id: 'route-2' })];

interface Rendered {
  readonly fixture: ComponentFixture<RouteSelectionBar>;
  readonly actions: ChosenRouteActions;
  readonly dialog: ClosingDialog;
  readonly cleared: number[];
}

async function render(outcome = true, selected: readonly RouteView[] = routes): Promise<Rendered> {
  const actions = new ChosenRouteActions(outcome);
  const dialog = new ClosingDialog(outcome);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RouteActions, useValue: actions },
      { provide: Dialog, useValue: dialog },
    ],
  });
  const fixture = TestBed.createComponent(RouteSelectionBar);
  fixture.componentRef.setInput('routes', selected);
  const cleared: number[] = [];
  fixture.componentInstance.cleared.subscribe(() => cleared.push(1));
  fixture.detectChanges();
  await answerClusterStatus(TestBed.inject(HttpTestingController));
  await settle(fixture);
  return { fixture, actions, dialog, cleared };
}

async function press({ fixture }: Rendered, name: string): Promise<void> {
  byRole(fixture, 'button', name).click();
  await settle(fixture);
}

describe('RouteSelectionBar', () => {
  it('counts the routes selected', async () => {
    const { fixture } = await render();

    expect(textOf(fixture).startsWith('2 selected')).toBe(true);
  });

  it('purges the cache of the selected routes and clears the selection', async () => {
    const bar = await render();

    await press(bar, 'Purge cache');

    expect([bar.actions.purged, bar.cleared]).toEqual([[routes], [1]]);
  });

  it('keeps the selection when nothing was purged', async () => {
    const bar = await render(false);

    await press(bar, 'Purge cache');

    expect(bar.cleared).toEqual([]);
  });

  it('deletes the selected routes and clears the selection', async () => {
    const bar = await render();

    await press(bar, 'Delete…');

    expect([bar.actions.deleted, bar.cleared]).toEqual([[routes], [1]]);
  });

  it('keeps the selection when deleting is cancelled', async () => {
    const bar = await render(false);

    await press(bar, 'Delete…');

    expect(bar.cleared).toEqual([]);
  });

  it('moves the selected routes and clears the selection', async () => {
    const bar = await render();

    await press(bar, 'Move to project…');

    expect([bar.dialog.opened, bar.cleared]).toEqual([
      [{ component: MoveRoutesDialog, data: routes }],
      [1],
    ]);
  });

  it('keeps the selection when moving is cancelled', async () => {
    const bar = await render(false);

    await press(bar, 'Move to project…');

    expect(bar.cleared).toEqual([]);
  });

  it('clears the selection', async () => {
    const bar = await render();

    await press(bar, 'Clear selection');

    expect(bar.cleared).toEqual([1]);
  });

  it('won’t delete or move routes that come from a stack file', async () => {
    const stack = { stack: 'shop', service: 'web', name: 'site', fields: ['host', 'project'] };
    const { fixture } = await render(true, [routes[0], { ...routes[1], stack }]);

    expect(byRole<HTMLButtonElement>(fixture, 'button', 'Delete…').disabled).toBe(true);
    expect(byRole<HTMLButtonElement>(fixture, 'button', 'Move to project…').disabled).toBe(true);
    expect(textOf(fixture)).toContain('1 of them come from a stack file.');
  });
});
