import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster } from '@datapoint/apiary-ui';
import { RedirectView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProject, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle } from '../testing/dom';
import { RedirectDialog } from './redirect-dialog';
import { RedirectList } from './redirect-list';

function aRedirect(overrides: Partial<RedirectView> = {}): RedirectView {
  return {
    id: 'redirect-1',
    projectId: 'project-1',
    from: 'www.example.com',
    to: 'https://example.com',
    statusCode: 308,
    keepPath: true,
    changedAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

interface Rendered {
  readonly fixture: ComponentFixture<RedirectList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(
  redirects: RedirectView[],
  role: Role = 'operator',
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(RedirectList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/redirects/list').flush(redirects);
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

describe('RedirectList', () => {
  it('shows where each hostname redirects, how, and its project', async () => {
    const { fixture } = await render([aRedirect()]);

    expect(cellsOfRow(fixture, 'www.example.com').slice(0, 5)).toEqual([
      'www.example.com',
      'https://example.com',
      '308Permanent, keeps method',
      'Kept',
      'Shop',
    ]);
  });

  it.each([
    [301, 'Permanent'],
    [302, 'Temporary'],
    [307, 'Temporary, keeps method'],
  ])('names the %i status code', async (statusCode, label) => {
    const { fixture } = await render([aRedirect({ statusCode })]);

    expect(cellsOfRow(fixture, 'www.example.com')[2]).toBe(`${statusCode}${label}`);
  });

  it('says when a redirect drops the path', async () => {
    const { fixture } = await render([aRedirect({ keepPath: false })]);

    expect(cellsOfRow(fixture, 'www.example.com')[3]).toBe('Dropped');
  });

  it('explains redirects when there are none', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No redirects yet')).toBeTruthy();
  });

  it('offers a viewer no way to add or delete redirects', async () => {
    const { fixture } = await render([aRedirect()], 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Add redirect'),
      queryByRole(fixture, 'button', 'Delete redirect from www.example.com'),
    ]).toEqual([undefined, undefined]);
  });

  it('says where the new redirect sends visitors', async () => {
    const list = await render(
      [aRedirect()],
      'operator',
      new ClosingDialog({ from: 'old.example.com', to: 'https://new.example.com' }),
    );

    byRole(list.fixture, 'button', 'Add redirect').click();
    await settle(list.fixture);

    expect([list.dialog.opened[0].component, TestBed.inject(Toaster).toasts()[0]]).toEqual([
      RedirectDialog,
      expect.objectContaining({
        heading: 'Redirect added',
        text: 'old.example.com now redirects to https://new.example.com.',
      }),
    ]);
  });

  it('deletes a redirect once confirmed', async () => {
    const list = await render([aRedirect()]);

    byRole(list.fixture, 'button', 'Delete redirect from www.example.com').click();
    const request = await nextRequest(list.backend, '/api/redirects/delete');
    request.flush(null);

    expect([request.request.body, list.confirmer.asked[0].heading]).toEqual([
      { id: 'redirect-1' },
      'Delete the redirect from www.example.com?',
    ]);
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'The redirect from www.example.com was deleted.',
      ),
    );
  });
});
