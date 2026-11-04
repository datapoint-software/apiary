import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Confirmer, Toaster } from '@datapoint/apiary-ui';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { nextRequest } from '../testing/backend';
import { aProject } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { RefusingConfirmer } from '../testing/refusing-confirmer';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ProjectActions } from './project-actions';
import { ProjectDialog } from './project-dialog';

const empty = aProject({ id: 'project-1', name: 'Shop', routeCount: 0 });
const full = aProject({ id: 'project-1', name: 'Shop', routeCount: 2 });

function setUp(dialog = new ClosingDialog(), confirmer: object = new AcceptingConfirmer()) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return {
    actions: TestBed.inject(ProjectActions),
    backend: TestBed.inject(HttpTestingController),
    toasts: TestBed.inject(Toaster).toasts,
    navigate,
    dialog,
  };
}

describe('ProjectActions', () => {
  it('opens the new project dialog empty', async () => {
    const { actions, dialog } = setUp();

    await actions.create();

    expect(dialog.opened).toEqual([{ component: ProjectDialog, data: null }]);
  });

  it('goes to a created project and suggests adding a route', async () => {
    const { actions, toasts, navigate } = setUp(
      new ClosingDialog({ id: 'project-9', name: 'Blog' }),
    );

    await actions.create();

    expect([toasts()[0].text, navigate.mock.calls[0][0]]).toEqual([
      'Blog created. Add its first route next.',
      ['/projects', 'project-9'],
    ]);
  });

  it('stays put when creating is cancelled', async () => {
    const { actions, toasts, navigate } = setUp();

    await actions.create();

    expect([toasts(), navigate.mock.calls]).toEqual([[], []]);
  });

  it('confirms an edited project was saved', async () => {
    const { actions, toasts, dialog } = setUp(new ClosingDialog({ id: 'project-1', name: 'Shop' }));

    await actions.edit(full);

    expect([dialog.opened[0].data, toasts()[0].text]).toEqual([full, 'Shop saved.']);
  });

  it('says nothing when editing is cancelled', async () => {
    const { actions, toasts } = setUp();

    await actions.edit(full);

    expect(toasts()).toEqual([]);
  });

  it('deletes an empty project once confirmed', async () => {
    const { actions, backend, toasts, navigate } = setUp();

    const deleting = actions.delete(empty);
    const request = await nextRequest(backend, '/api/projects/delete');
    request.flush(null);
    await deleting;

    expect([request.request.body, toasts()[0].text, navigate.mock.calls[0][0]]).toEqual([
      { id: 'project-1' },
      'Shop deleted.',
      ['/projects'],
    ]);
  });

  it('keeps an empty project when deleting is not confirmed', async () => {
    const { actions, toasts, navigate } = setUp(new ClosingDialog(), new RefusingConfirmer());

    await actions.delete(empty);

    expect([toasts(), navigate.mock.calls]).toEqual([[], []]);
  });

  it('asks where the contents of a project go before deleting it', async () => {
    const { actions, dialog } = setUp();

    await actions.delete(full);

    expect(dialog.opened).toEqual([{ component: DeleteProjectDialog, data: full }]);
  });

  it('goes to the project the contents moved to', async () => {
    const { actions, toasts, navigate } = setUp(
      new ClosingDialog(aProject({ id: 'project-2', name: 'Blog' })),
    );

    await actions.delete(full);

    expect([toasts()[0].text, navigate.mock.calls[0][0]]).toEqual([
      'Shop deleted. What it held moved to Blog.',
      ['/projects', 'project-2'],
    ]);
  });
});
