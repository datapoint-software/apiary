import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { BrandView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import { byLabel, byRole, choose, errorOf, settle, textOf, type } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { BrandDialog, BrandDialogData } from './brand-dialog';

const existing: BrandView = {
  name: 'Example Lda',
  accent: '#1D4ED8',
  contact: 'Questions? Write to help@example.com.',
  logo: 'data:image/png;base64,AAAA',
  logoName: 'logo.png',
  changedAt: '2026-11-04T10:00:00Z',
};
const clusterBrand: BrandDialogData = { projectId: null, heading: 'Set up the brand', choices: [] };

interface Rendered {
  readonly fixture: ComponentFixture<BrandDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(data: BrandDialogData = clusterBrand): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(BrandDialog);
  const backend = TestBed.inject(HttpTestingController);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, ref };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

async function save({ fixture }: Rendered): Promise<void> {
  byRole(fixture, 'button', 'Save brand').click();
  await settle(fixture);
}

function chooseLogo({ fixture }: Rendered, file: File): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));
}

function previewButton(fixture: ComponentFixture<BrandDialog>): HTMLElement {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('div')].find(
    (div) => div.textContent?.trim() === 'Continue',
  ) as HTMLElement;
}

describe('BrandDialog', () => {
  it('asks for a name', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', '   ');
    await save(dialog);

    expect(errorOf(dialog.fixture, 'Name')).toBe('Fill this in.');
    dialog.backend.expectNone('/api/brands/save');
  });

  it('keeps names to 60 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'a'.repeat(61));
    await save(dialog);

    expect(errorOf(dialog.fixture, 'Name')).toBe('Use at most 60 characters.');
  });

  it('keeps the contact line to 120 characters', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Contact line (optional)', 'a'.repeat(121));
    await save(dialog);

    expect(errorOf(dialog.fixture, 'Contact line (optional)')).toBe('Use at most 120 characters.');
  });

  it('asks for an accent color like #1D4ED8', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Accent color', 'blue');
    await save(dialog);

    expect(errorOf(dialog.fixture, 'Accent color')).toBe(
      'Enter a color like #1D4ED8, or pick one.',
    );
  });

  it('sets the accent color from the picker', async () => {
    const dialog = await render();
    const picker = byLabel(dialog.fixture, 'Pick the accent color');

    picker.value = '#ff8800';
    picker.dispatchEvent(new Event('input'));
    await settle(dialog.fixture);

    expect(byLabel(dialog.fixture, 'Accent color').value).toBe('#FF8800');
  });

  it.each([
    ['#1D4ED8', 'rgb(255, 255, 255)'],
    ['#FFE066', 'rgb(17, 17, 17)'],
  ])('previews %s with the text that reads better on it', async (accent, color) => {
    const dialog = await render();

    await fillIn(dialog, 'Accent color', accent);

    expect(previewButton(dialog.fixture).style.color).toBe(color);
  });

  it('previews the name and contact line', async () => {
    const dialog = await render();

    await fillIn(dialog, 'Name', 'Example Lda');
    await fillIn(dialog, 'Contact line (optional)', 'Call 555 0100.');

    expect(textOf(dialog.fixture)).toContain(
      'PreviewExample LdaRestricted accessEnter the password you were given.ContinueCall 555 0100.',
    );
  });

  it('saves the cluster brand', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', ' Example Lda ');
    await fillIn(dialog, 'Accent color', '#ff8800');

    await save(dialog);
    const request = await nextRequest(dialog.backend, '/api/brands/save');

    expect(request.request.body).toEqual({
      projectId: null,
      name: 'Example Lda',
      accent: '#FF8800',
      contact: null,
      logo: null,
      logoName: null,
    });
  });

  it('says visitor pages use the saved brand', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', 'Example Lda');

    await save(dialog);
    (await nextRequest(dialog.backend, '/api/brands/save')).flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['Visitor pages use it now.']));
  });

  it('keeps the logo of the brand being edited', async () => {
    const dialog = await render({
      projectId: 'project-1',
      heading: 'Brand of Shop',
      brand: existing,
      choices: [],
    });

    await save(dialog);
    const request = await nextRequest(dialog.backend, '/api/brands/save');

    expect(request.request.body).toMatchObject({
      projectId: 'project-1',
      logo: 'data:image/png;base64,AAAA',
      logoName: 'logo.png',
    });
  });

  it('removes the logo', async () => {
    const dialog = await render({ ...clusterBrand, brand: existing });

    byRole(dialog.fixture, 'button', 'Remove logo').click();
    await settle(dialog.fixture);
    await save(dialog);
    const request = await nextRequest(dialog.backend, '/api/brands/save');

    expect(request.request.body).toMatchObject({ logo: null, logoName: null });
  });

  it('reads a chosen logo', async () => {
    const dialog = await render();

    chooseLogo(dialog, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    await vi.waitFor(() => expect(textOf(dialog.fixture)).toContain('logo.svg'));
  });

  it('refuses a logo that isn’t PNG, WebP or SVG', async () => {
    const dialog = await render();

    chooseLogo(dialog, new File(['GIF89a'], 'logo.gif', { type: 'image/gif' }));
    await settle(dialog.fixture);

    expect(textOf(dialog.fixture)).toContain('Choose a PNG, WebP or SVG file.');
  });

  it('refuses a logo over 100 KB', async () => {
    const dialog = await render();

    chooseLogo(dialog, new File(['x'.repeat(102_401)], 'logo.png', { type: 'image/png' }));
    await settle(dialog.fixture);

    expect(textOf(dialog.fixture)).toContain('Choose a logo up to 100 KB.');
  });

  it('shows the API’s logo error under the logo', async () => {
    const dialog = await render();
    await fillIn(dialog, 'Name', 'Example Lda');

    await save(dialog);
    (await nextRequest(dialog.backend, '/api/brands/save')).flush(
      aProblem(400, 'validation.failed', [{ field: 'logo', code: 'brand.logoTooLarge' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(dialog.fixture);

    expect(
      (dialog.fixture.nativeElement as HTMLElement).querySelector('#logo-error')?.textContent,
    ).toContain('Choose a logo up to 100 KB.');
  });

  it('asks which project gets its own brand', async () => {
    const dialog = await render({
      projectId: null,
      heading: 'Give a project its own brand',
      choices: [aProject({ id: 'project-2', name: 'Blog' })],
    });
    await fillIn(dialog, 'Name', 'Blog Co');

    await save(dialog);

    expect(errorOf(dialog.fixture, 'Project')).toBe('Choose a project.');
  });

  it('gives the chosen project its own brand', async () => {
    const dialog = await render({
      projectId: null,
      heading: 'Give a project its own brand',
      choices: [aProject({ id: 'project-2', name: 'Blog' })],
    });
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Project'), 'project-2');
    await fillIn(dialog, 'Name', 'Blog Co');

    await save(dialog);
    const request = await nextRequest(dialog.backend, '/api/brands/save');
    request.flush(null);

    expect(request.request.body.projectId).toBe('project-2');
    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['Blog has its own brand now.']));
  });

  it('closes without saving when cancelled', async () => {
    const dialog = await render();

    byRole(dialog.fixture, 'button', 'Cancel').click();

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
