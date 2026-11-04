import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { RouteView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject, aRoute } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { MoveRoutesDialog } from './move-routes-dialog';

const shop = aRoute({ id: 'route-1' });
const blog = aRoute({ id: 'route-2', host: 'blog.example.com' });

interface Rendered {
  readonly fixture: ComponentFixture<MoveRoutesDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(routes: RouteView[] = [shop, blog]): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: routes },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(MoveRoutesDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend
    .expectOne('/api/projects/list')
    .flush([
      aProject({ id: 'project-1', name: 'Shop' }),
      aProject({ id: 'project-2', name: 'Blog' }),
    ]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function moveTo({ fixture }: Rendered, projectId: string): Promise<void> {
  choose(byLabel<HTMLSelectElement>(fixture, 'Project'), projectId);
  await settle(fixture);
  byRole(fixture, 'button', 'Move routes').click();
  await settle(fixture);
}

describe('MoveRoutesDialog', () => {
  it('counts the routes being moved', async () => {
    const { fixture } = await render([shop]);

    expect(byRole(fixture, 'heading', 'Move 1 route')).toBeTruthy();
  });

  it('asks for a project', async () => {
    const dialog = await render();

    await moveTo(dialog, '');

    expect(errorOf(dialog.fixture, 'Project')).toBe('Choose a project.');
  });

  it('moves every route to the project chosen', async () => {
    const dialog = await render();

    await moveTo(dialog, 'project-2');
    const request = await nextRequest(dialog.backend, '/api/routes/move');

    expect(request.request.body).toEqual({ ids: ['route-1', 'route-2'], projectId: 'project-2' });
  });

  it('says where the routes moved and closes', async () => {
    const dialog = await render();

    await moveTo(dialog, 'project-2');
    (await nextRequest(dialog.backend, '/api/routes/move')).flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual([true]));
    expect(TestBed.inject(Toaster).toasts()[0].text).toBe('2 routes moved to Blog.');
  });

  it('shows the API’s error on the project', async () => {
    const dialog = await render();

    await moveTo(dialog, 'project-2');
    (await nextRequest(dialog.backend, '/api/routes/move')).flush(
      aProblem(400, 'validation.failed', [{ field: 'projectId', code: 'project.notFound' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Project')).toBe('Choose a project.');
  });

  it('closes without moving when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
