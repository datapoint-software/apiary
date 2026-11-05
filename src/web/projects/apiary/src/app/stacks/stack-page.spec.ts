import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { Role, StackDetailsView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aPipelineToken, aSignedInUser, aStack } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { StackPage } from './stack-page';
import { TokenDialog } from './token-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<StackPage>;
  readonly backend: HttpTestingController;
  readonly confirmer: AcceptingConfirmer;
  readonly dialog: ClosingDialog;
}

const applied: StackDetailsView = {
  stack: aStack({
    routes: 1,
    streamRoutes: 1,
    lastApply: {
      at: '2026-11-04T09:30:00Z',
      token: 'shop-deploy',
      commit: '4f2a9c1e8b7d',
      pipelineUrl: 'https://gitlab.example.com/shop/-/pipelines/7',
      plan: {
        added: [{ kind: 'route', name: 'shop.example.com' }],
        changed: [
          {
            kind: 'route',
            name: 'api.example.com',
            field: 'timeout',
            from: '60',
            to: '30',
            replacedBy: 'ana@example.com',
            replacedAt: '2026-11-03T09:00:00Z',
          },
        ],
        removed: [{ kind: 'redirect', name: 'old.example.com' }],
      },
    },
  }),
  items: [
    { kind: 'route', id: 'route-1', name: 'shop.example.com', service: 'web' },
    {
      kind: 'streamRoute',
      id: 'stream-1',
      name: 'postgres',
      service: 'db',
      protocol: 'tcp',
      listenPort: 5432,
    },
  ],
  tokens: [aPipelineToken()],
};

async function render(
  details: StackDetailsView | null,
  role: Role = 'administrator',
): Promise<Rendered> {
  const confirmer = new AcceptingConfirmer();
  const dialog = new ClosingDialog();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(StackPage);
  fixture.componentRef.setInput('name', 'shop');
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  const request = backend.expectOne('/api/stacks/get');
  expect(request.request.body).toEqual({ name: 'shop' });
  if (details) {
    request.flush(details);
  } else {
    request.flush(
      { status: 404, code: 'stack.notFound' },
      { status: 404, statusText: 'Not Found' },
    );
  }
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, confirmer, dialog };
}

describe('StackPage', () => {
  it('shows the last apply with its commit and pipeline', async () => {
    const { fixture } = await render(applied);

    const commit = byRole<HTMLAnchorElement>(fixture, 'link', '4f2a9c1e8b7d');
    expect(commit.href).toBe('https://gitlab.example.com/shop/-/pipelines/7');
    expect(textOf(fixture)).toContain('2026-11-04 09:30 UTC. Every apply is in the audit log.');
  });

  it('lists what the last apply changed, and warns when it replaced a change made in Apiary', async () => {
    const { fixture } = await render(applied);

    const rows = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('ap-plan-list .ap-list-row'),
    ].map((row) =>
      [row.querySelector('.ap-list-text'), row.querySelector('ap-status')].map((part) =>
        part?.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    );
    expect(rows).toEqual([
      ['Route shop.example.com', 'Added'],
      [
        expect.stringMatching(
          /^Route api\.example\.com : Timeout 60 → 30 It replaced a value ana@example\.com set .+\. A label sets it now, so it’s locked\.$/,
        ),
        'Replaced a change',
      ],
      ['Redirect old.example.com', 'Removed'],
    ]);
  });

  it('lists what the stack declares, linking to each', async () => {
    const { fixture } = await render(applied);

    expect(cellsOfRow(fixture, 'postgres')).toEqual(['postgres', 'Stream route TCP 5432', 'db']);
    expect(
      byRole<HTMLAnchorElement>(fixture, 'link', 'shop.example.com').getAttribute('href'),
    ).toBe('/routes/route-1');
  });

  it('explains the first apply before there was one', async () => {
    const { fixture } = await render({ stack: aStack(), items: [], tokens: [] });

    expect(textOf(fixture)).toContain('Nothing has applied shop yet');
    expect(textOf(fixture)).toContain('No tokens');
  });

  it('describes why the last apply failed', async () => {
    const { fixture } = await render({
      ...applied,
      stack: {
        ...applied.stack,
        failure: {
          at: '2026-11-04T10:00:00Z',
          code: 'route.hostInUse',
          token: 'shop-deploy',
          detail: 'grafana.example.com/api',
        },
      },
    });

    expect(textOf(fixture)).toContain(
      'grafana.example.com/api is already taken outside this stack',
    );
    expect(textOf(fixture)).toContain('error route.hostInUse');
  });

  it('shows the commands for this stack and this server', async () => {
    const { fixture } = await render(applied);

    expect(textOf(fixture)).toContain(
      `apply --dry-run --server ${location.origin} --stack shop /work/stack.yaml`,
    );
    expect(textOf(fixture)).toContain('docker stack deploy --compose-file stack.yaml shop');
  });

  it('creates a token for this stack', async () => {
    const { fixture, dialog } = await render(applied);

    byRole(fixture, 'button', 'Create token').click();
    await settle(fixture);

    expect(dialog.opened).toEqual([{ component: TokenDialog, data: 'shop' }]);
  });

  it('revokes a token after asking', async () => {
    const { fixture, backend, confirmer } = await render(applied);

    byRole(fixture, 'button', 'Revoke shop-deploy').click();
    const request = await nextRequest(backend, '/api/pipeline-tokens/revoke');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'token-1' });
    expect(confirmer.asked[0].heading).toBe('Revoke shop-deploy?');
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('shop-deploy no longer works.'),
    );
  });

  it('removes the stack once its name is typed, then goes back to the list', async () => {
    const { fixture, backend, confirmer } = await render(applied);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    byRole(fixture, 'button', 'Remove stack…').click();
    const request = await nextRequest(backend, '/api/stacks/remove');
    request.flush(null);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/stacks']));

    expect(request.request.body).toEqual({ name: 'shop' });
    expect(confirmer.asked[0].typeToConfirm).toBe('shop');
    expect(confirmer.asked[0].text).toContain(
      'Apiary deletes its 1 route, 1 stream route on every replica',
    );
    expect(confirmer.asked[0].text).toContain('Its pipeline token stops working.');
  });

  it('lets only administrators manage tokens and remove the stack', async () => {
    const { fixture } = await render(applied, 'operator');

    expect(queryByRole(fixture, 'button', 'Create token')).toBeUndefined();
    expect(queryByRole(fixture, 'button', 'Revoke shop-deploy')).toBeUndefined();
    expect(byRole<HTMLButtonElement>(fixture, 'button', 'Remove stack…').disabled).toBe(true);
  });

  it('says when the stack doesn’t exist', async () => {
    const { fixture } = await render(null);

    expect(textOf(fixture)).toContain('This stack doesn’t exist');
  });
});
