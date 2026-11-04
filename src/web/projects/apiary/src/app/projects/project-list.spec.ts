import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { answerClusterStatus } from '../testing/backend';
import { aProject, aSignedInUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { allByRole, byRole, queryByRole, settle } from '../testing/dom';
import { ProjectDialog } from './project-dialog';
import { ProjectList } from './project-list';

interface Rendered {
  readonly fixture: ComponentFixture<ProjectList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
}

async function render(projects: ProjectView[], role: Role = 'operator'): Promise<Rendered> {
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
  const fixture = TestBed.createComponent(ProjectList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush(projects);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

describe('ProjectList', () => {
  it('shows a card for each project', async () => {
    const { fixture } = await render([
      aProject({ id: 'project-1', name: 'Shop' }),
      aProject({ id: 'project-2', name: 'Blog' }),
    ]);

    expect(allByRole(fixture, 'heading').slice(1)).toEqual(['Shop', 'Blog']);
  });

  it('explains projects when there are none', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No projects yet')).toBeTruthy();
  });

  it('opens the new project dialog', async () => {
    const { fixture, dialog } = await render([]);

    byRole(fixture, 'button', 'New project').click();
    await settle(fixture);

    expect(dialog.opened[0].component).toBe(ProjectDialog);
  });

  it('offers a viewer no way to create a project', async () => {
    const { fixture } = await render([], 'viewer');

    expect(queryByRole(fixture, 'button', 'New project')).toBeUndefined();
  });
});
