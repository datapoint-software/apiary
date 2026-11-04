import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster } from '@datapoint/apiary-ui';
import { BrandView, BrandsView, ProjectView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProject, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { BrandDialog } from './brand-dialog';
import { VisitorPages } from './visitor-pages';

const now = new Date('2026-11-04T12:00:00Z');

function aBrand(overrides: Partial<BrandView> = {}): BrandView {
  return {
    name: 'Example Lda',
    accent: '#1D4ED8',
    contact: 'Questions? Write to help@example.com.',
    changedAt: '2026-11-04T10:00:00Z',
    ...overrides,
  };
}

const shop = aProject({ id: 'project-1', name: 'Shop' });
const blog = aProject({ id: 'project-2', name: 'Blog' });
const branded: BrandsView = {
  cluster: aBrand({ changedBy: 'Ana Silva' }),
  projects: [{ projectId: 'project-1', projectName: 'Shop', brand: aBrand({ name: 'Shop Co' }) }],
};

interface Rendered {
  readonly fixture: ComponentFixture<VisitorPages>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(
  brands: BrandsView,
  projects: ProjectView[] = [shop, blog],
  role: Role = 'operator',
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
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
  const fixture = TestBed.createComponent(VisitorPages);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/brands/list').flush(brands);
  backend.expectOne('/api/projects/list').flush(projects);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

describe('VisitorPages', () => {
  it('shows the cluster brand, its color and who changed it', async () => {
    const { fixture } = await render(branded);

    expect(textOf(fixture)).toContain(
      'ELExample LdaQuestions? Write to help@example.com.#1D4ED8 Changed 2 hours ago by Ana Silva',
    );
  });

  it('says a brand has no contact line', async () => {
    const { fixture } = await render({ cluster: aBrand({ contact: '' }), projects: [] });

    expect(textOf(fixture)).toContain('No contact line');
  });

  it('shows the logo instead of initials', async () => {
    const { fixture } = await render({
      cluster: aBrand({ logo: 'data:image/png;base64,AAAA' }),
      projects: [],
    });

    expect((fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src')).toBe(
      'data:image/png;base64,AAAA',
    );
  });

  it('offers to set up the brand when there is none', async () => {
    const page = await render({ projects: [] });

    byRole(page.fixture, 'button', 'Set up the brand').click();
    await settle(page.fixture);

    expect(page.dialog.opened[0]).toEqual({
      component: BrandDialog,
      data: { projectId: null, brand: undefined, heading: 'Set up the brand', choices: [] },
    });
  });

  it('opens the cluster brand to edit', async () => {
    const page = await render(branded);

    byRole(page.fixture, 'button', 'Edit…').click();
    await settle(page.fixture);

    expect(page.dialog.opened[0].data).toEqual({
      projectId: null,
      brand: branded.cluster,
      heading: 'Cluster brand',
      choices: [],
    });
  });

  it('confirms the brand was saved', async () => {
    const page = await render(
      branded,
      [shop, blog],
      'operator',
      new ClosingDialog('Visitor pages use it now.'),
    );

    byRole(page.fixture, 'button', 'Edit…').click();
    await settle(page.fixture);

    expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
      heading: 'Brand saved',
      text: 'Visitor pages use it now.',
    });
  });

  it('lists the projects with their own brand', async () => {
    const { fixture } = await render(branded);

    expect(cellsOfRow(fixture, 'Shop Co').slice(0, 4)).toEqual([
      'Shop',
      'SCShop CoQuestions? Write to help@example.com.',
      '#1D4ED8',
      '2 hours ago',
    ]);
  });

  it('opens a project’s brand to edit', async () => {
    const page = await render(branded);

    byRole(page.fixture, 'button', 'Edit the brand of Shop').click();
    await settle(page.fixture);

    expect(page.dialog.opened[0].data).toMatchObject({
      projectId: 'project-1',
      heading: 'Brand of Shop',
    });
  });

  it('offers only the projects without a brand to give one', async () => {
    const page = await render(branded);

    byRole(page.fixture, 'button', 'Give a project its own brand').click();
    await settle(page.fixture);

    expect(page.dialog.opened[0].data).toEqual({
      projectId: null,
      heading: 'Give a project its own brand',
      choices: [blog],
    });
  });

  it('says every project uses the cluster brand', async () => {
    const { fixture } = await render({ cluster: aBrand(), projects: [] });

    expect(byRole(fixture, 'heading', 'Every project uses the cluster brand')).toBeTruthy();
  });

  it('removes a project’s brand once confirmed', async () => {
    const page = await render(branded);

    byRole(page.fixture, 'button', 'Remove the brand of Shop').click();
    const request = await nextRequest(page.backend, '/api/brands/remove');
    request.flush(null);

    expect(request.request.body).toEqual({ projectId: 'project-1' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Shop uses the cluster brand again.'),
    );
  });

  it('removes the cluster brand once confirmed', async () => {
    const page = await render(branded);

    byRole(page.fixture, 'button', 'Remove…').click();
    const request = await nextRequest(page.backend, '/api/brands/remove');
    request.flush(null);

    expect([request.request.body, page.confirmer.asked[0].heading]).toEqual([
      { projectId: null },
      'Remove the cluster brand?',
    ]);
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('The cluster brand was removed.'),
    );
  });

  it('offers a viewer no way to change brands', async () => {
    const { fixture } = await render(branded, [shop, blog], 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Edit…'),
      queryByRole(fixture, 'button', 'Give a project its own brand'),
      queryByRole(fixture, 'button', 'Remove the brand of Shop'),
    ]).toEqual([undefined, undefined, undefined]);
  });
});
