import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { ProjectView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { allByRole, byLabel, byRole, choose, errorOf, settle, textOf } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { DeleteProjectDialog } from './delete-project-dialog';

const shop = aProject({
  id: 'project-1',
  name: 'Shop',
  routeCount: 2,
  redirectCount: 1,
  streamCount: 3,
  certificateCount: 1,
});
const blog = aProject({ id: 'project-2', name: 'Blog' });

interface Rendered {
  readonly fixture: ComponentFixture<DeleteProjectDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(project: ProjectView = shop): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: project },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(DeleteProjectDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush([shop, blog]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function moveAndDelete({ fixture }: Rendered): Promise<void> {
  byRole(fixture, 'button', 'Move and delete').click();
  await settle(fixture);
}

describe('DeleteProjectDialog', () => {
  it('says what the project holds', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain(
      'Shop has 2 routes, 1 redirect, 3 stream routes, 1 uploaded certificate. They keep working',
    );
  });

  it('leaves out what the project doesn’t hold', async () => {
    const { fixture } = await render(aProject({ name: 'Shop', routeCount: 1 }));

    expect(textOf(fixture)).toContain('Shop has 1 route. They keep working');
  });

  it('offers only the other projects', async () => {
    const { fixture } = await render();

    expect(allByRole(fixture, 'option')).toEqual(['Choose a project', 'Blog']);
  });

  it('asks where the contents go', async () => {
    const dialog = await render();

    await moveAndDelete(dialog);

    expect(errorOf(dialog.fixture, 'Move them to')).toBe('Choose where they go.');
    dialog.backend.expectNone('/api/projects/delete');
  });

  it('moves the contents and deletes the project', async () => {
    const dialog = await render();
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Move them to'), 'project-2');
    await settle(dialog.fixture);

    await moveAndDelete(dialog);
    const request = await nextRequest(dialog.backend, '/api/projects/delete');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'project-1', moveTo: 'project-2' });
    await vi.waitFor(() => expect(dialog.ref.results).toEqual([blog]));
  });

  it('shows the API’s error on the destination', async () => {
    const dialog = await render();
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Move them to'), 'project-2');
    await settle(dialog.fixture);

    await moveAndDelete(dialog);
    (await nextRequest(dialog.backend, '/api/projects/delete')).flush(
      aProblem(400, 'validation.failed', [{ field: 'moveTo', code: 'project.moveToSelf' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Move them to')).toBe('Choose another project to move them to.');
  });

  it('closes without deleting when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
