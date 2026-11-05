import { DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { AddStackDialog } from './add-stack-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<AddStackDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(AddStackDialog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function add({ fixture }: Rendered): Promise<void> {
  byRole(fixture, 'button', 'Add stack').click();
  await settle(fixture);
}

describe('AddStackDialog', () => {
  it('names the first token after the stack until it’s named', async () => {
    const dialog = await render();

    type(byLabel(dialog.fixture, 'Stack name'), 'shop');
    await settle(dialog.fixture);
    expect(byLabel(dialog.fixture, 'Token name').value).toBe('shop-deploy');

    type(byLabel(dialog.fixture, 'Token name'), 'gitlab');
    type(byLabel(dialog.fixture, 'Stack name'), 'blog');
    await settle(dialog.fixture);
    expect(byLabel(dialog.fixture, 'Token name').value).toBe('gitlab');
  });

  it('asks for the name as Docker writes it', async () => {
    const dialog = await render();
    type(byLabel(dialog.fixture, 'Stack name'), 'Shop Front');

    await add(dialog);

    expect(errorOf(dialog.fixture, 'Stack name')).toBe(
      'Use the name as Docker writes it: lowercase letters, digits, hyphens and underscores, up to 63.',
    );
    dialog.backend.expectNone('/api/stacks/add');
  });

  it('adds the stack and its first token, and returns the token', async () => {
    const dialog = await render();
    type(byLabel(dialog.fixture, 'Stack name'), ' shop ');
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Project (optional)'), 'project-1');
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Token expires after'), '365');
    await settle(dialog.fixture);

    await add(dialog);
    const request = await nextRequest(dialog.backend, '/api/stacks/add');
    const created = {
      id: 'token-1',
      name: 'shop-deploy',
      stack: 'shop',
      token: 'apiary_pt_secret',
      expiresAt: '2027-11-04T10:00:00Z',
    };
    request.flush(created);

    expect(request.request.body).toEqual({
      name: 'shop',
      tokenName: 'shop-deploy',
      projectId: 'project-1',
      tokenDays: 365,
    });
    await vi.waitFor(() => expect(dialog.ref.results).toEqual([created]));
  });

  it('shows why Apiary refused it next to the field', async () => {
    const dialog = await render();
    type(byLabel(dialog.fixture, 'Stack name'), 'shop');
    await settle(dialog.fixture);

    await add(dialog);
    (await nextRequest(dialog.backend, '/api/stacks/add')).flush(
      aProblem(409, 'stack.exists', [{ field: 'name', code: 'stack.exists' }]),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Stack name')).toBe(
      'This stack is already here. Open it to create another token.',
    );
    expect(dialog.ref.results).toEqual([]);
  });
});
