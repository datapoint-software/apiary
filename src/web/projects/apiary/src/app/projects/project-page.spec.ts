import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CertificateSummary, ProjectView, Role, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { answerClusterStatus } from '../testing/backend';
import { aCertificate, aProject, aRoute, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byLabel, byRole, queryByRole, settle, textOf } from '../testing/dom';
import { ProjectDialog } from './project-dialog';
import { ProjectPage } from './project-page';

const shop = aProject({
  id: 'project-1',
  name: 'Shop',
  description: 'Online store',
  routeCount: 2,
  redirectCount: 3,
  requestsPerMinute: 12,
});
const blog = aProject({ id: 'project-2', name: 'Blog' });
const storefront = aRoute({ id: 'route-1', projectId: 'project-1', host: 'shop.example.com' });
const checkout = aRoute({
  id: 'route-2',
  projectId: 'project-1',
  host: 'pay.example.com',
  disabled: true,
});
const news = aRoute({ id: 'route-3', projectId: 'project-2', host: 'blog.example.com' });

interface Rendered {
  readonly fixture: ComponentFixture<ProjectPage>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
}

interface Options {
  readonly id?: string;
  readonly routes?: RouteView[];
  readonly certificates?: CertificateSummary[];
  readonly projects?: ProjectView[];
  readonly role?: Role;
}

async function render({
  id = 'project-1',
  routes = [storefront, checkout, news],
  certificates = [],
  projects = [shop, blog],
  role = 'operator',
}: Options = {}): Promise<Rendered> {
  const dialog = new ClosingDialog();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(ProjectPage);
  fixture.componentRef.setInput('id', id);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush(projects);
  backend.expectOne('/api/routes/list').flush(routes);
  backend.expectOne('/api/certificates/list').flush(certificates);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

function stat(fixture: ComponentFixture<ProjectPage>, overline: string): string {
  const stats = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ap-stat')];
  const found = stats.find((s) => s.querySelector('.ap-overline')?.textContent === overline);
  return (found?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(overline.length);
}

describe('ProjectPage', () => {
  it('shows the project’s name and description', async () => {
    const { fixture } = await render();

    expect([byRole(fixture, 'heading', 'Shop'), textOf(fixture).includes('Online store')]).toEqual([
      expect.anything(),
      true,
    ]);
  });

  it('counts the routes and how many are disabled', async () => {
    const { fixture } = await render();

    expect(stat(fixture, 'Routes')).toBe('21 disabled');
  });

  it('shows the requests and redirects', async () => {
    const { fixture } = await render();

    expect([stat(fixture, 'Requests'), stat(fixture, 'Redirects')]).toEqual(['12/min', '3']);
  });

  it('counts the project’s certificates and the automatic ones of its hostnames', async () => {
    const { fixture } = await render({
      certificates: [
        aCertificate({ id: 'c-1', source: 'uploaded', projectId: 'project-1', hosts: [] }),
        aCertificate({ id: 'c-2', source: 'automatic', hosts: ['shop.example.com'] }),
        aCertificate({ id: 'c-3', source: 'automatic', hosts: ['blog.example.com'] }),
        aCertificate({ id: 'c-4', source: 'uploaded', hosts: ['shop.example.com'] }),
      ],
    });

    expect(stat(fixture, 'Certificates')).toBe('2');
  });

  it('lists only the project’s routes', async () => {
    const { fixture } = await render();

    expect([
      queryByRole(fixture, 'link', 'shop.example.com'),
      queryByRole(fixture, 'link', 'pay.example.com'),
      queryByRole(fixture, 'link', 'blog.example.com'),
    ]).toEqual([expect.anything(), expect.anything(), undefined]);
  });

  it('suggests adding a route when the project has none', async () => {
    const { fixture } = await render({ routes: [news] });

    expect(byRole(fixture, 'heading', 'No routes in this project')).toBeTruthy();
  });

  it('adds a route to this project', async () => {
    const { fixture } = await render({ routes: [] });

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('a[href^="/routes/new"]')
        ?.getAttribute('href'),
    ).toBe('/routes/new?project=project-1');
  });

  it('shows the selection bar once a route is selected', async () => {
    const { fixture } = await render();

    byLabel(fixture, 'Select shop.example.com').click();
    await settle(fixture);

    expect(textOf(fixture)).toContain('1 selected');
  });

  it('hides the selection bar once the selection is cleared', async () => {
    const { fixture } = await render();
    byLabel(fixture, 'Select all routes shown').click();
    await settle(fixture);

    byRole(fixture, 'button', 'Clear selection').click();
    await settle(fixture);

    expect(queryByRole(fixture, 'button', 'Clear selection')).toBeUndefined();
  });

  it('opens the project to edit', async () => {
    const { fixture, dialog } = await render();

    byRole(fixture, 'button', 'Edit project').click();
    await settle(fixture);

    expect(dialog.opened).toEqual([{ component: ProjectDialog, data: shop }]);
  });

  it('offers a viewer no way to change the project', async () => {
    const { fixture } = await render({ role: 'viewer' });

    expect([
      queryByRole(fixture, 'button', 'Edit project'),
      queryByRole(fixture, 'button', 'Delete project'),
      queryByRole(fixture, 'link', 'Add route'),
    ]).toEqual([undefined, undefined, undefined]);
  });

  it('says the project doesn’t exist', async () => {
    const { fixture } = await render({ id: 'project-9' });

    expect(byRole(fixture, 'heading', 'This page doesn’t exist')).toBeTruthy();
  });
});
