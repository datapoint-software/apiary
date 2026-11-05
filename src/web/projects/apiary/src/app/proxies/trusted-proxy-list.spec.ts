import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { Role, TrustedProxyView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aSignedInUser, aTrustedProxy } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, definitionOf, queryByRole, settle, textOf } from '../testing/dom';
import { TrustedProxyDialog } from './trusted-proxy-dialog';
import { TrustedProxyList } from './trusted-proxy-list';

const now = new Date('2026-11-04T12:00:00Z');
const loadBalancer = aTrustedProxy({ id: 'proxy-1', range: '10.20.30.0/24', note: 'Load balancer', lastRequestAt: '2026-11-04T11:55:00Z' });

interface Rendered {
  readonly fixture: ComponentFixture<TrustedProxyList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(proxies: TrustedProxyView[], role: Role = 'administrator', dialog = new ClosingDialog()): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(TrustedProxyList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/trusted-proxies/list').flush(proxies);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

afterEach(() => vi.useRealTimers());

describe('TrustedProxyList', () => {
  it('shows each proxy’s range, note and last request', async () => {
    const { fixture } = await render([loadBalancer]);

    expect(cellsOfRow(fixture, '10.20.30.0/24').slice(0, 3)).toEqual(['10.20.30.0/24', 'Load balancer', '5 minutes ago']);
  });

  it('tags a public range', async () => {
    const { fixture } = await render([aTrustedProxy({ range: '173.245.48.0/20', public: true })]);

    expect(cellsOfRow(fixture, '173.245.48.0/20')[0]).toBe('173.245.48.0/20Public');
  });

  it('says a proxy has no note', async () => {
    const { fixture } = await render([aTrustedProxy({ note: null })]);

    expect(cellsOfRow(fixture, '10.20.30.0/24')[1]).toBe('No note');
  });

  it.each([
    [null, 'No requests yet'],
    ['2026-11-02T12:00:00Z', 'Last 2 days ago'],
  ])('warns about a proxy whose last request was at %s', async (lastRequestAt, status) => {
    const { fixture } = await render([aTrustedProxy({ lastRequestAt })]);

    expect(cellsOfRow(fixture, '10.20.30.0/24')[2]).toBe(status);
  });

  it('lists the ranges that haven’t sent a request for a day', async () => {
    const { fixture } = await render([
      loadBalancer,
      aTrustedProxy({ id: 'proxy-2', range: '173.245.48.0/20', lastRequestAt: null }),
      aTrustedProxy({ id: 'proxy-3', range: '2400:cb00::/32', lastRequestAt: '2026-11-01T12:00:00Z' }),
    ]);

    expect(textOf(fixture)).toContain('2 ranges haven’t sent a request for a day173.245.48.0/20, 2400:cb00::/32. If the provider');
  });

  it('doesn’t warn when every proxy sent a request within a day', async () => {
    const { fixture } = await render([loadBalancer]);

    expect(textOf(fixture)).not.toContain('sent a request for a day');
  });

  it('explains trusted proxies when there are none', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No trusted proxies')).toBeTruthy();
  });

  it('offers a viewer no way to change the proxies', async () => {
    const { fixture } = await render([loadBalancer], 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Add proxy'),
      queryByRole(fixture, 'button', 'Edit 10.20.30.0/24'),
      queryByRole(fixture, 'button', 'Remove 10.20.30.0/24'),
      textOf(fixture).includes('Only Administrators can change them.'),
    ]).toEqual([undefined, undefined, undefined, true]);
  });

  it('offers an operator no way to change the proxies', async () => {
    const { fixture } = await render([loadBalancer], 'operator');

    expect(queryByRole(fixture, 'button', 'Add proxy')).toBeUndefined();
  });

  it('opens the dialog to add a proxy', async () => {
    const list = await render([loadBalancer]);

    await press(list, 'Add proxy');

    expect(list.dialog.opened[0]).toEqual({ component: TrustedProxyDialog, data: { proxy: null, proxies: [loadBalancer] } });
  });

  it('says a new proxy is trusted', async () => {
    const list = await render([], 'administrator', new ClosingDialog({ range: '192.0.2.0/24', added: true }));

    byRole(list.fixture, 'button', 'Add proxy').click();

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Proxy added',
        text: 'Requests from 192.0.2.0/24 now keep their X-Forwarded-For, on every replica.',
      }),
    );
  });

  it('opens the dialog to edit a proxy and says it was saved', async () => {
    const list = await render([loadBalancer], 'administrator', new ClosingDialog({ range: '10.20.30.0/24', added: false }));

    byRole(list.fixture, 'button', 'Edit 10.20.30.0/24').click();

    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()[0]?.heading).toBe('Saved'));
    expect(list.dialog.opened[0].data).toEqual({ proxy: loadBalancer, proxies: [loadBalancer] });
  });

  it('asks before it stops trusting a proxy, and says when it last sent a request', async () => {
    const list = await render([loadBalancer]);

    await press(list, 'Remove 10.20.30.0/24');

    expect(list.confirmer.asked[0]).toMatchObject({
      heading: 'Stop trusting 10.20.30.0/24?',
      text: 'Requests from it will count as coming from the proxy itself: route allowlists see the proxy’s address, everyone behind it shares one rate limit, and Apiary replaces the X-Forwarded-For it sends on. It sent a request 5 minutes ago.',
      confirm: 'Remove proxy',
    });
  });

  it('leaves out the last request when it was more than an hour ago', async () => {
    const list = await render([aTrustedProxy({ lastRequestAt: '2026-11-04T10:00:00Z' })]);

    await press(list, 'Remove 10.20.30.0/24');

    expect(list.confirmer.asked[0].text).not.toContain('It sent a request');
  });

  it('removes a proxy and says it is no longer trusted', async () => {
    const list = await render([loadBalancer]);

    byRole(list.fixture, 'button', 'Remove 10.20.30.0/24').click();
    const request = await nextRequest(list.backend, '/api/trusted-proxies/remove');
    request.flush(null);

    await vi.waitFor(() => expect(TestBed.inject(Toaster).toasts()[0]?.text).toBe('10.20.30.0/24 is no longer trusted.'));
    expect(request.request.body).toEqual({ id: 'proxy-1' });
  });

  it('tries a request with the proxies on the list', async () => {
    const { fixture } = await render([loadBalancer, aTrustedProxy({ id: 'proxy-2', range: '173.245.48.0/20' })]);

    expect(definitionOf(fixture, 'Client address')).toBe('198.51.100.23');
  });
});
