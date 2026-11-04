import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { ProjectView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
import { noServerChecks } from '../testing/no-server-checks';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { ProjectDialog } from './project-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<ProjectDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(existing: ProjectView | null = null): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([noServerChecks])),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: existing },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(ProjectDialog);
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController), ref };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

describe('ProjectDialog', () => {
  it('asks for a name', async () => {
    const dialog = await render();

    await press(dialog, 'Create project');

    expect(errorOf(dialog.fixture, 'Name')).toBe('Fill this in.');
  });

  it('keeps names to 40 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'a'.repeat(41));
    await press(dialog, 'Create project');

    expect(errorOf(dialog.fixture, 'Name')).toBe('Use at most 40 characters.');
  });

  it('keeps descriptions to 120 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Description (optional)', 'a'.repeat(121));
    await press(dialog, 'Create project');

    expect(errorOf(dialog.fixture, 'Description (optional)')).toBe('Use at most 120 characters.');
  });

  it('creates a project with the icon chosen', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', ' Blog ');
    await fillIn(dialog, 'Description (optional)', ' The company blog ');
    byLabel(dialog.fixture, 'megaphone').click();

    await press(dialog, 'Create project');
    const request = await nextRequest(dialog.backend, '/api/projects/create');

    expect(request.request.body).toEqual({
      name: 'Blog',
      description: 'The company blog',
      icon: 'megaphone',
    });
  });

  it('closes with the new project', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', 'Blog');

    await press(dialog, 'Create project');
    (await nextRequest(dialog.backend, '/api/projects/create')).flush('project-9');

    await vi.waitFor(() => expect(dialog.ref.results).toEqual([{ id: 'project-9', name: 'Blog' }]));
  });

  it('shows the project being edited', async () => {
    const dialog = await render(aProject({ name: 'Shop', description: 'Online store' }));

    expect([
      byRole(dialog.fixture, 'heading', 'Edit project'),
      byLabel(dialog.fixture, 'Name').value,
      byLabel(dialog.fixture, 'Description (optional)').value,
    ]).toEqual([expect.anything(), 'Shop', 'Online store']);
  });

  it('saves the project being edited', async () => {
    const dialog = await render(aProject({ id: 'project-1', icon: 'store' }));
    await fillIn(dialog, 'Name', 'Store');

    await press(dialog, 'Save project');
    const request = await nextRequest(dialog.backend, '/api/projects/update');
    request.flush(null);

    expect(request.request.body).toEqual({
      id: 'project-1',
      name: 'Store',
      description: '',
      icon: 'store',
    });
    await vi.waitFor(() =>
      expect(dialog.ref.results).toEqual([{ id: 'project-1', name: 'Store' }]),
    );
  });

  it('shows the API’s error on the field it names', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', 'Shop');

    await press(dialog, 'Create project');
    (await nextRequest(dialog.backend, '/api/projects/create')).flush(
      aProblem(400, 'validation.failed', [{ field: 'name', code: 'project.nameTaken' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Name')).toBe(
      'There’s already a project with this name. Choose another.',
    );
  });

  it('closes without saving when cancelled', async () => {
    const dialog = await render();

    await press(dialog, 'Cancel');

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
