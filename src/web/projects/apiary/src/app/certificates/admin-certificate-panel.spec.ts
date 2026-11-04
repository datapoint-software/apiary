import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster } from '@datapoint/apiary-ui';
import { AdminCertificateView } from '../api/models';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, definitionOf, queryByRole, settle, textOf } from '../testing/dom';
import { AdminCertificatePanel } from './admin-certificate-panel';
import { UploadDialog } from './upload-dialog';

const selfSigned: AdminCertificateView = {
  selfSigned: true,
  hosts: ['apiary.internal'],
  issuer: 'Apiary',
  notBefore: '2026-11-01T10:00:00Z',
  notAfter: '2027-11-01T10:00:00Z',
  fingerprint: 'AB:CD:EF',
  changedAt: '2026-11-01T10:00:00Z',
  changedBy: null,
};
const trusted: AdminCertificateView = {
  ...selfSigned,
  selfSigned: false,
  hosts: ['admin.example.com'],
  issuer: 'Example CA',
};

interface Rendered {
  readonly fixture: ComponentFixture<AdminCertificatePanel>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(
  certificate: AdminCertificateView | null,
  dialog = new ClosingDialog(),
): Promise<Rendered> {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  const fixture = TestBed.createComponent(AdminCertificatePanel);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/admin-certificate/get').flush(certificate);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

describe('AdminCertificatePanel', () => {
  it('warns that browsers warn about a self-signed certificate', async () => {
    const { fixture } = await render(selfSigned);

    expect(definitionOf(fixture, 'Source')).toContain(
      'Browsers warn about it. Check the fingerprint before you accept it',
    );
  });

  it('shows what the certificate covers, until when and its fingerprint', async () => {
    const { fixture } = await render(trusted);

    expect(
      ['Source', 'Covers', 'Issuer', 'Valid until', 'SHA-256 fingerprint'].map((term) =>
        definitionOf(fixture, term),
      ),
    ).toEqual(['Uploaded', 'admin.example.com', 'Example CA', '2027-11-01 10:00 UTC', 'AB:CD:EF']);
  });

  it('says the cluster creates a certificate once it has a majority', async () => {
    const { fixture } = await render(null);

    expect(textOf(fixture)).toContain(
      'The cluster creates a self-signed certificate once a majority of replicas is up.',
    );
  });

  it('offers no way back to a self-signed certificate while one is in use', async () => {
    const { fixture } = await render(selfSigned);

    expect(queryByRole(fixture, 'button', 'Use a self-signed one')).toBeUndefined();
  });

  it('opens the upload dialog for the admin interface', async () => {
    const panel = await render(trusted);

    byRole(panel.fixture, 'button', 'Upload certificate').click();
    await settle(panel.fixture);

    expect(panel.dialog.opened[0]).toEqual({
      component: UploadDialog,
      data: { name: 'the admin interface', admin: true },
    });
  });

  it('reloads the certificate once a new one is uploaded', async () => {
    const panel = await render(selfSigned, new ClosingDialog('admin'));

    byRole(panel.fixture, 'button', 'Upload certificate').click();
    (await nextRequest(panel.backend, '/api/admin-certificate/get')).flush(trusted);
    await settle(panel.fixture);

    expect(textOf(panel.fixture)).toContain('admin.example.com');
  });

  it('switches back to a self-signed certificate once confirmed', async () => {
    const panel = await render(trusted);

    byRole(panel.fixture, 'button', 'Use a self-signed one').click();
    await settle(panel.fixture);
    (await nextRequest(panel.backend, '/api/admin-certificate/reset')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].heading).toBe('Self-signed certificate in use'),
    );
  });

  it('warns that browsers may refuse a self-signed certificate', async () => {
    const panel = await render(trusted);

    byRole(panel.fixture, 'button', 'Use a self-signed one').click();
    await settle(panel.fixture);

    expect(panel.confirmer.asked[0].text).toContain('refuse the self-signed one for up to a year');
  });
});
