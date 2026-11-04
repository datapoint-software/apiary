import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { Role, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aRoute, aSignedInUser } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, textOf, type } from '../testing/dom';
import { RouteDefaultsPanel } from './route-defaults-panel';

interface Rendered {
  readonly fixture: ComponentFixture<RouteDefaultsPanel>;
  readonly backend: HttpTestingController;
  readonly confirmer: AcceptingConfirmer;
}

async function render(routes: RouteView[] = [aRoute()], role: Role = 'administrator'): Promise<Rendered> {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(RouteDefaultsPanel);
  fixture.componentRef.setInput('routes', routes);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/routes/defaults').flush({ requestMegabytes: 30 });
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, confirmer };
}

async function saveSize({ fixture }: Rendered, amount: string, unit = 'MB'): Promise<void> {
  type(byLabel(fixture, 'Largest request'), amount);
  choose(byLabel<HTMLSelectElement>(fixture, 'Unit'), unit);
  await settle(fixture);
  byRole(fixture, 'button', 'Save default').click();
  await settle(fixture);
}

describe('RouteDefaultsPanel', () => {
  it('shows the current default', async () => {
    const { fixture } = await render();

    expect(byLabel(fixture, 'Largest request').value).toBe('30');
  });

  it('sends the new default in megabytes', async () => {
    const panel = await render();

    await saveSize(panel, '5', 'GB');
    const request = await nextRequest(panel.backend, '/api/routes/update-defaults');

    expect(request.request.body).toEqual({ requestMegabytes: 5000 });
  });

  it('says how many routes the change affects', async () => {
    const panel = await render([aRoute({ id: 'a' }), aRoute({ id: 'b' }), aRoute({ id: 'c', requestSize: 'unlimited' })]);

    await saveSize(panel, '5', 'GB');

    expect(panel.confirmer.asked[0]).toMatchObject({ heading: 'Change the limit on 2 routes?', tone: 'primary' });
  });

  it('warns that lowering the default makes larger uploads fail', async () => {
    const panel = await render();

    await saveSize(panel, '10');

    expect(panel.confirmer.asked[0]).toMatchObject({ tone: 'danger' });
    expect(panel.confirmer.asked[0].text).toContain('413');
  });

  it('saves without asking when no route uses the default', async () => {
    const panel = await render([aRoute({ requestSize: 'custom', requestMegabytes: 500 })]);

    await saveSize(panel, '5', 'GB');
    (await nextRequest(panel.backend, '/api/routes/update-defaults')).flush(null);

    expect(panel.confirmer.asked).toEqual([]);
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Default saved',
        text: 'New routes accept requests up to 5 GB, on every replica.',
      }),
    );
  });

  it('sends nothing when the default doesn’t change', async () => {
    const panel = await render();

    await saveSize(panel, '30');

    panel.backend.expectNone('/api/routes/update-defaults');
  });

  it.each([['0', 'MB'], ['101', 'GB'], ['1.5', 'MB']])('refuses %s %s', async (amount, unit) => {
    const panel = await render();

    await saveSize(panel, amount, unit);

    expect(errorOf(panel.fixture, 'Largest request')).toBe('Enter a whole number from 1 MB to 100 GB.');
    panel.backend.expectNone('/api/routes/update-defaults');
  });

  it('lists the routes with their own limit, warning about those open to everyone', async () => {
    const { fixture } = await render([
      aRoute({ id: 'a', host: 'wiki.example.com', requestSize: 'custom', requestMegabytes: 100 }),
      aRoute({ id: 'b', host: 'hub.example.com', requestSize: 'unlimited' }),
      aRoute({ id: 'c', host: 'files.example.com', requestSize: 'unlimited', allowedAddresses: ['10.0.0.0/8'] }),
    ]);

    expect(textOf(fixture)).toContain('wiki.example.com100 MB');
    expect(textOf(fixture)).toContain('hub.example.comNo limit, open to everyone');
    expect(textOf(fixture)).toContain('files.example.comNo limit');
  });

  it('only shows the default to operators', async () => {
    const { fixture } = await render([aRoute()], 'operator');

    expect(textOf(fixture)).toContain('Default size30 MB. Every route uses it. Only Administrators can change it.');
    expect(() => byRole(fixture, 'button', 'Save default')).toThrow();
  });
});
