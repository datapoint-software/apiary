import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer } from '@datapoint/apiary-ui';
import { RedirectView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aRedirect, aRoute, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { PathRedirectsSection } from './path-redirects-section';
import { RedirectDialog } from './redirect-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<PathRedirectsSection>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
}

async function render(
  redirects: RedirectView[],
  role: Role = 'operator',
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: new AcceptingConfirmer() },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(PathRedirectsSection);
  fixture.componentRef.setInput(
    'route',
    aRoute({ host: 'shop.example.com', projectId: 'project-2' }),
  );
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/redirects/list').flush(redirects);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

const onRoute = aRedirect({ id: 'redirect-2', from: 'shop.example.com', path: '/old', to: '/new' });

describe('PathRedirectsSection', () => {
  it('shows the paths redirected on this hostname only', async () => {
    const { fixture } = await render([
      onRoute,
      aRedirect({
        id: 'redirect-3',
        from: 'shop.example.com',
        path: '/',
        to: 'https://example.com',
      }),
      aRedirect({ id: 'redirect-4', from: 'blog.example.com', path: '/archive', to: '/posts' }),
    ]);

    expect(cellsOfRow(fixture, '/old').slice(0, 3)).toEqual([
      '/old',
      '/new Same hostname',
      '308Permanent, keeps method',
    ]);
    expect(textOf(fixture)).not.toContain('/archive');
  });

  it('stays out of a route that isn’t saved yet', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(PathRedirectsSection);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController).expectNone('/api/redirects/list');
    expect(textOf(fixture)).toBe('');
  });

  it('says every path reaches the routes when none is redirected', async () => {
    const { fixture } = await render([]);

    expect(textOf(fixture)).toContain(
      'No path redirects. Every path on this hostname reaches its routes.',
    );
  });

  it('opens the dialog for this hostname and its project', async () => {
    const section = await render(
      [],
      'operator',
      new ClosingDialog({ from: 'shop.example.com/old', to: '/new' }),
    );

    byRole(section.fixture, 'button', 'Add path redirect').click();
    (await nextRequest(section.backend, '/api/redirects/list')).flush([onRoute]);

    expect(section.dialog.opened).toEqual([
      { component: RedirectDialog, data: { host: 'shop.example.com', projectId: 'project-2' } },
    ]);
  });

  it('deletes a path redirect', async () => {
    const section = await render([onRoute]);

    byRole(section.fixture, 'button', 'Delete redirect from shop.example.com/old').click();
    const request = await nextRequest(section.backend, '/api/redirects/delete');

    expect(request.request.body).toEqual({ id: 'redirect-2' });
  });

  it('leaves out adding and deleting for viewers', async () => {
    const { fixture } = await render([onRoute], 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Add path redirect'),
      queryByRole(fixture, 'button', 'Delete redirect from shop.example.com/old'),
    ]).toEqual([undefined, undefined]);
  });
});
