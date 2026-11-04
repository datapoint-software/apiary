import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { CertificatePreview } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aProject } from '../testing/builders';
import {
  alertsOf,
  byLabel,
  byRole,
  choose,
  definitionOf,
  errorOf,
  settle,
  type,
} from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { UploadDialog, UploadTarget } from './upload-dialog';

const chainPem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
const keyPem = '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----';
const preview: CertificatePreview = {
  hosts: ['shop.example.com', 'www.shop.example.com'],
  issuer: 'Example CA',
  notBefore: '2026-11-01T10:00:00Z',
  notAfter: '2027-11-01T10:00:00Z',
  chainLength: 2,
};
const refused = { status: 400, statusText: 'Bad Request' };

interface Rendered {
  readonly fixture: ComponentFixture<UploadDialog>;
  readonly backend: HttpTestingController;
  readonly ref: RecordingDialogRef;
}

async function render(replacing: UploadTarget | null = null): Promise<Rendered> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: DIALOG_DATA, useValue: replacing },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(UploadDialog);
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

async function fillIn({ fixture }: Rendered, chain: string, key: string): Promise<void> {
  type(byLabel<HTMLTextAreaElement>(fixture, 'Certificate and chain'), chain);
  type(byLabel<HTMLTextAreaElement>(fixture, 'Private key'), key);
  await settle(fixture);
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

async function reachPreview(dialog: Rendered): Promise<void> {
  await fillIn(dialog, chainPem, keyPem);
  await press(dialog, 'Continue');
  (await nextRequest(dialog.backend, '/api/certificates/check')).flush(preview);
  await settle(dialog.fixture);
}

function fileInputs(fixture: ComponentFixture<UploadDialog>): HTMLInputElement[] {
  return [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="file"]',
    ),
  ];
}

describe('UploadDialog', () => {
  it('asks for the certificate and the key before checking them', async () => {
    const dialog = await render();

    await press(dialog, 'Continue');

    expect([
      errorOf(dialog.fixture, 'Certificate and chain'),
      errorOf(dialog.fixture, 'Private key'),
    ]).toEqual([
      'Paste the certificate and its chain, or choose the file.',
      'Paste the private key, or choose the file.',
    ]);
    dialog.backend.expectNone('/api/certificates/check');
  });

  it('asks for a PEM certificate', async () => {
    const dialog = await render();

    await fillIn(dialog, 'not a certificate', keyPem);
    await press(dialog, 'Continue');

    expect(errorOf(dialog.fixture, 'Certificate and chain')).toBe(
      'Paste a PEM certificate: it starts with -----BEGIN CERTIFICATE-----.',
    );
  });

  it.each([
    ['not a key', 'Paste a PEM private key: it starts with -----BEGIN PRIVATE KEY-----.'],
    [
      '-----BEGIN ENCRYPTED PRIVATE KEY-----',
      'This key is protected by a passphrase. Remove it first, for example with openssl pkey.',
    ],
  ])('refuses the private key %s', async (key, message) => {
    const dialog = await render();

    await fillIn(dialog, chainPem, key);
    await press(dialog, 'Continue');

    expect(errorOf(dialog.fixture, 'Private key')).toBe(message);
  });

  it('accepts an RSA private key', async () => {
    const dialog = await render();

    await fillIn(dialog, chainPem, '-----BEGIN RSA PRIVATE KEY-----');
    await press(dialog, 'Continue');

    expect(errorOf(dialog.fixture, 'Private key')).toBe('');
  });

  it('sends the certificate and key to be checked', async () => {
    const dialog = await render();

    await fillIn(dialog, chainPem, keyPem);
    await press(dialog, 'Continue');
    const request = await nextRequest(dialog.backend, '/api/certificates/check');

    expect(request.request.body).toEqual({ chainPem, keyPem, replacingId: undefined });
  });

  it('shows the API’s error on the field it names', async () => {
    const dialog = await render();

    await fillIn(dialog, chainPem, keyPem);
    await press(dialog, 'Continue');
    (await nextRequest(dialog.backend, '/api/certificates/check')).flush(
      aProblem(400, 'validation.failed', [{ field: 'keyPem', code: 'certificate.keyMismatch' }]),
      refused,
    );
    await settle(dialog.fixture);

    expect(errorOf(dialog.fixture, 'Private key')).toBe(
      'This private key doesn’t match the certificate. Check that both come from the same request.',
    );
  });

  it('shows what the certificate covers before adding it', async () => {
    const dialog = await render();

    await reachPreview(dialog);

    expect(
      ['Covers', 'Issuer', 'Valid', 'Chain'].map((term) => definitionOf(dialog.fixture, term)),
    ).toEqual([
      'shop.example.com, www.shop.example.com',
      'Example CA',
      '2026-11-01 10:00 to 2027-11-01 10:00 UTC',
      'Complete, 2 certificates',
    ]);
  });

  it('goes back to the form', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Back');

    expect(byLabel<HTMLTextAreaElement>(dialog.fixture, 'Private key').value).toBe(keyPem);
  });

  it('adds the certificate to the first project', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    const request = await nextRequest(dialog.backend, '/api/certificates/upload');

    expect(request.request.body).toEqual({
      projectId: 'project-1',
      chainPem,
      keyPem,
      replacingId: undefined,
    });
  });

  it('adds the certificate to the project chosen', async () => {
    const dialog = await render();
    choose(byLabel<HTMLSelectElement>(dialog.fixture, 'Project'), 'project-2');
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    const request = await nextRequest(dialog.backend, '/api/certificates/upload');

    expect(request.request.body.projectId).toBe('project-2');
  });

  it('closes with the new certificate’s id', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    (await nextRequest(dialog.backend, '/api/certificates/upload')).flush('certificate-9');

    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['certificate-9']));
  });

  it('says what the added certificate covers', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    (await nextRequest(dialog.backend, '/api/certificates/upload')).flush('certificate-9');

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Certificate added',
        text: 'It covers shop.example.com, www.shop.example.com until 2027-11-01.',
      }),
    );
  });

  it('explains why the certificate wasn’t added', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    (await nextRequest(dialog.backend, '/api/certificates/upload')).flush(
      aProblem(409, 'certificate.expired'),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(dialog.fixture);

    expect(alertsOf(dialog.fixture)).toContain(appMessages['certificate.expired']({}));
    expect(dialog.ref.results).toEqual([]);
  });

  it('says when Apiary didn’t answer', async () => {
    const dialog = await render();
    await reachPreview(dialog);

    await press(dialog, 'Add certificate');
    (await nextRequest(dialog.backend, '/api/certificates/upload')).error(
      new ProgressEvent('error'),
    );
    await settle(dialog.fixture);

    expect(alertsOf(dialog.fixture)).toContain(
      'Apiary didn’t answer. Check your connection and try again.',
    );
  });

  it('names the certificate it replaces', async () => {
    const dialog = await render({ id: 'certificate-3', name: 'shop.example.com' });

    expect(
      byRole(dialog.fixture, 'heading', 'Replace the certificate for shop.example.com'),
    ).toBeTruthy();
  });

  it('replaces the certificate', async () => {
    const dialog = await render({
      id: 'certificate-3',
      name: 'shop.example.com',
      projectId: 'project-2',
    });
    await reachPreview(dialog);

    await press(dialog, 'Replace certificate');
    const request = await nextRequest(dialog.backend, '/api/certificates/upload');

    expect(request.request.body).toEqual({
      projectId: 'project-2',
      chainPem,
      keyPem,
      replacingId: 'certificate-3',
    });
  });

  it('checks a replacement against the certificate it replaces', async () => {
    const dialog = await render({ id: 'certificate-3', name: 'shop.example.com' });

    await fillIn(dialog, chainPem, keyPem);
    await press(dialog, 'Continue');
    const request = await nextRequest(dialog.backend, '/api/certificates/check');

    expect(request.request.body.replacingId).toBe('certificate-3');
  });

  it('replaces the admin interface’s certificate', async () => {
    const dialog = await render({ name: 'the admin interface', admin: true });
    await reachPreview(dialog);

    await press(dialog, 'Replace certificate');
    const request = await nextRequest(dialog.backend, '/api/admin-certificate/upload');
    request.flush(null);

    await vi.waitFor(() => expect(dialog.ref.results).toEqual(['admin']));
    expect(request.request.body).toEqual({ chainPem, keyPem });
  });

  it('asks for no project for the admin interface', async () => {
    const dialog = await render({ name: 'the admin interface', admin: true });

    expect(
      byRole(dialog.fixture, 'heading', 'Replace the certificate for the admin interface'),
    ).toBeTruthy();
    expect(() => byLabel(dialog.fixture, 'Project')).toThrow();
  });

  it('reads the certificate from a chosen file', async () => {
    const dialog = await render();
    const input = fileInputs(dialog.fixture)[0];
    Object.defineProperty(input, 'files', {
      value: [new File([chainPem], 'shop.pem')],
    });

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() =>
      expect(byLabel<HTMLTextAreaElement>(dialog.fixture, 'Certificate and chain').value).toBe(
        chainPem,
      ),
    );
  });

  it('reads the key from a dropped file', async () => {
    const dialog = await render();
    const drop = fileInputs(dialog.fixture)[1].closest('label') as HTMLLabelElement;
    const event = new Event('drop', { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['Files'], files: [new File([keyPem], 'shop.key')] },
    });

    drop.dispatchEvent(event);
    await vi.waitFor(() =>
      expect(byLabel<HTMLTextAreaElement>(dialog.fixture, 'Private key').value).toBe(keyPem),
    );
  });

  it('marks the drop zone while a file is dragged over it', async () => {
    const dialog = await render();
    const drop = fileInputs(dialog.fixture)[0].closest('label') as HTMLLabelElement;
    const event = new Event('dragenter', { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [] } });

    drop.dispatchEvent(event);
    await settle(dialog.fixture);

    expect(drop.hasAttribute('data-over')).toBe(true);
  });

  it('closes without a result when cancelled', async () => {
    const dialog = await render();

    await press(dialog, 'Cancel');

    expect(dialog.ref.results).toEqual([undefined]);
  });
});
