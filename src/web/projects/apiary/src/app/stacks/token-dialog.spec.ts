import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { TokenDialog } from './token-dialog';

interface Rendered {
  readonly fixture: ComponentFixture<TokenDialog>;
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
      { provide: DIALOG_DATA, useValue: 'shop' },
    ],
  });
  const fixture = TestBed.createComponent(TokenDialog);
  await settle(fixture);
  return { fixture, backend: TestBed.inject(HttpTestingController), ref };
}

describe('TokenDialog', () => {
  it('creates a token for the stack, named after it unless renamed', async () => {
    const dialog = await render();
    expect(byLabel(dialog.fixture, 'Name').value).toBe('shop-deploy');
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Expires after'), '30');
    await settle(dialog.fixture);

    byRole(dialog.fixture, 'button', 'Create token').click();
    const request = await nextRequest(dialog.backend, '/api/pipeline-tokens/create');
    request.flush({
      id: 'token-2',
      name: 'shop-deploy',
      stack: 'shop',
      token: 'apiary_pt_secret',
      expiresAt: '2026-12-04T10:00:00Z',
    });

    expect(request.request.body).toEqual({ stack: 'shop', name: 'shop-deploy', days: 30 });
    await vi.waitFor(() => expect(dialog.ref.results).toHaveLength(1));
  });

  it('asks for another name when one is taken', async () => {
    const dialog = await render();
    type(byLabel(dialog.fixture, 'Name'), 'blog-deploy');
    await settle(dialog.fixture);

    byRole(dialog.fixture, 'button', 'Create token').click();
    (await nextRequest(dialog.backend, '/api/pipeline-tokens/create')).flush(
      aProblem(409, 'pipelineToken.nameTaken', [
        { field: 'name', code: 'pipelineToken.nameTaken' },
      ]),
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Name')).toBe('Another token has this name. Choose another.');
  });
});
