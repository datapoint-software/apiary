import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { CertificateSummary, CertificateDetails as Details, DnsProviderView, Role, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import {
  aCertificate,
  aCertificateDetails,
  aProblem,
  aProject,
  aSignedInUser,
} from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, queryByRole, settle, textOf } from '../testing/dom';
import { RefusingConfirmer } from '../testing/refusing-confirmer';
import { CertificateDetails } from './certificate-details';
import { UploadDialog } from './upload-dialog';

const now = new Date('2026-11-04T12:00:00Z');

interface Rendered {
  readonly fixture: ComponentFixture<CertificateDetails>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
}

interface Around {
  readonly providers?: DnsProviderView[];
  readonly routes?: RouteView[];
  readonly certificates?: CertificateSummary[];
}

async function render(
  details: Details,
  role: Role = 'operator',
  confirmer: AcceptingConfirmer | RefusingConfirmer = new AcceptingConfirmer(),
  { providers = [], routes = [], certificates = [] }: Around = {},
): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const dialog = new ClosingDialog();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'certificates', children: [] }]),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(CertificateDetails);
  fixture.componentRef.setInput('id', details.certificate.id);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/certificates/get').flush(details);
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  backend.expectOne('/api/dns-providers/list').flush(providers);
  backend.expectOne('/api/routes/list').flush(routes);
  backend.expectOne('/api/certificates/list').flush(certificates);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog };
}

async function press({ fixture }: Rendered, button: string): Promise<void> {
  byRole(fixture, 'button', button).click();
  await settle(fixture);
}

const automatic = aCertificateDetails({
  certificate: aCertificate({
    id: 'certificate-1',
    name: 'shop.example.com',
    source: 'automatic',
    notAfter: '2026-12-04T12:00:00Z',
    projectId: 'project-1',
  }),
});
const uploaded = aCertificateDetails({
  certificate: aCertificate({
    id: 'certificate-2',
    name: 'internal.example.com',
    source: 'uploaded',
    notAfter: '2026-12-04T12:00:00Z',
    routeCount: 0,
  }),
});

function eventsOf(fixture: ComponentFixture<CertificateDetails>): string[][] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ap-event')].map((event) =>
    [...event.querySelectorAll('div > div, time')].map(
      (part) => part.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    ),
  );
}

afterEach(() => vi.useRealTimers());

describe('CertificateDetails', () => {
  it('names the certificate, its status and its source', async () => {
    const { fixture } = await render(automatic);

    expect(textOf(fixture)).toContain('30 days left · Automatic');
  });

  it('shows the project the certificate belongs to', async () => {
    const { fixture } = await render(automatic);

    expect(textOf(fixture)).toContain('Shop');
  });

  it('says when the certificate doesn’t exist', async () => {
    const dialog = new ClosingDialog();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideErrorMessages(appMessages),
        { provide: Dialog, useValue: dialog },
      ],
    });
    const fixture = TestBed.createComponent(CertificateDetails);
    fixture.componentRef.setInput('id', 'certificate-404');
    const backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    backend
      .expectOne('/api/certificates/get')
      .flush(aProblem(404, 'certificate.notFound'), { status: 404, statusText: 'Not Found' });
    backend.expectOne('/api/projects/list').flush([]);
    backend.expectOne('/api/dns-providers/list').flush([]);
    backend.expectOne('/api/routes/list').flush([]);
    backend.expectOne('/api/certificates/list').flush([]);
    await settle(fixture);

    expect(textOf(fixture)).toContain('This certificate doesn’t exist');
  });

  it('explains why the renewal is failing', async () => {
    const { fixture } = await render(
      aCertificateDetails({
        certificate: aCertificate({
          status: 'failing',
          notAfter: '2026-11-20T12:00:00Z',
          nextAttemptAt: '2026-11-04T18:00:00Z',
        }),
        history: [
          {
            at: '2026-11-04T11:00:00Z',
            kind: 'failed',
            code: 'acme.timedOut',
            detail: 'urn:ietf:params:acme:error:connection',
          },
        ],
      }),
    );

    expect(textOf(fixture)).toContain(
      'Renewal is failing Let’s Encrypt didn’t finish in time. Apiary tries again later. urn:ietf:params:acme:error:connection',
    );
  });

  it('says when Apiary tries again', async () => {
    const { fixture } = await render(
      aCertificateDetails({
        certificate: aCertificate({
          status: 'failing',
          notAfter: '2026-11-20T12:00:00Z',
          nextAttemptAt: '2026-11-04T18:00:00Z',
        }),
        history: [{ at: '2026-11-04T11:00:00Z', kind: 'failed' }],
      }),
    );

    expect(textOf(fixture)).toContain(
      'Apiary tries again at 2026-11-04 18:00 UTC. Fix the cause, then renew now.',
    );
  });

  it('explains why a new certificate can’t be issued yet', async () => {
    const { fixture } = await render(
      aCertificateDetails({
        certificate: aCertificate({ status: 'failing' }),
        history: [{ at: '2026-11-04T11:00:00Z', kind: 'failed' }],
      }),
    );

    expect(textOf(fixture)).toContain('Apiary can’t get this certificate yet');
  });

  it('explains how a certificate is requested', async () => {
    const { fixture } = await render(
      aCertificateDetails({ certificate: aCertificate({ status: 'pending' }) }),
    );

    expect(textOf(fixture)).toContain('Requesting the certificate');
  });

  it('lists the renewal log of an automatic certificate', async () => {
    const { fixture } = await render(
      aCertificateDetails({
        certificate: aCertificate({ source: 'automatic' }),
        history: [{ at: '2026-10-01T10:00:00Z', kind: 'issued' }],
      }),
    );

    expect([byRole(fixture, 'heading', 'Renewal log'), eventsOf(fixture)]).toEqual([
      expect.anything(),
      [['Issued', '', '2026-10-01 10:00']],
    ]);
  });

  it('says who changed an uploaded certificate', async () => {
    const { fixture } = await render(
      aCertificateDetails({
        certificate: aCertificate({ source: 'uploaded' }),
        history: [{ at: '2026-10-01T10:00:00Z', kind: 'replaced', by: 'Ana Silva' }],
      }),
    );

    expect(eventsOf(fixture)).toEqual([['Replaced', 'By Ana Silva', '2026-10-01 10:00']]);
  });

  it('says when nothing happened to a certificate yet', async () => {
    const { fixture } = await render(automatic);

    expect(textOf(fixture)).toContain('Nothing yet.');
  });

  it('renews an automatic certificate', async () => {
    const certificate = await render(automatic);

    await press(certificate, 'Renew now');
    const request = await nextRequest(certificate.backend, '/api/certificates/renew');

    expect(request.request.body).toEqual({ id: 'certificate-1' });
  });

  it('says until when the renewed certificate is valid', async () => {
    const certificate = await render(automatic);

    await press(certificate, 'Renew now');
    (await nextRequest(certificate.backend, '/api/certificates/renew')).flush({
      renewed: true,
      notAfter: '2027-02-02T12:00:00Z',
    });

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Certificate renewed',
        text: 'Valid until 2027-02-02. Every replica uses it now.',
      }),
    );
  });

  it('explains why the renewal failed', async () => {
    const certificate = await render(automatic);

    await press(certificate, 'Renew now');
    (await nextRequest(certificate.backend, '/api/certificates/renew')).flush({
      renewed: false,
      failureCode: 'acme.rejected',
      failureDetail: 'Rate limited',
    });

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Renewal failed',
        text: 'Let’s Encrypt refused the request. Rate limited',
        tone: 'error',
      }),
    );
  });

  it('explains why the renewal wasn’t started', async () => {
    const certificate = await render(automatic);

    await press(certificate, 'Renew now');
    (await nextRequest(certificate.backend, '/api/certificates/renew')).flush(
      aProblem(409, 'certificate.renewing'),
      { status: 409, statusText: 'Conflict' },
    );
    await settle(certificate.fixture);

    expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
      'It’s being renewed already. Wait a minute, then reload.',
    );
  });

  it('offers to replace an uploaded certificate instead of renewing it', async () => {
    const { fixture } = await render(uploaded);

    expect([
      queryByRole(fixture, 'button', 'Renew now'),
      queryByRole(fixture, 'button', 'Replace…'),
    ]).toEqual([undefined, expect.anything()]);
  });

  it('opens the upload dialog to replace a certificate', async () => {
    const certificate = await render(uploaded);

    await press(certificate, 'Replace…');

    expect(certificate.dialog.opened[0]).toEqual({
      component: UploadDialog,
      data: uploaded.certificate,
    });
  });

  it('offers a viewer neither renewing nor deleting', async () => {
    const { fixture } = await render(automatic, 'viewer');

    expect([
      queryByRole(fixture, 'button', 'Renew now'),
      queryByRole(fixture, 'button', 'Delete…'),
    ]).toEqual([undefined, undefined]);
  });

  it('deletes the certificate once confirmed', async () => {
    const certificate = await render(uploaded);

    byRole(certificate.fixture, 'button', 'Delete…').click();
    const request = await nextRequest(certificate.backend, '/api/certificates/delete');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'certificate-2' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/certificates'));
  });

  it('asks before deleting the certificate', async () => {
    const confirmer = new RefusingConfirmer();
    const certificate = await render(uploaded, 'operator', confirmer);

    await press(certificate, 'Delete…');

    expect(confirmer.asked[0].heading).toBe('Delete the certificate for internal.example.com?');
    certificate.backend.expectNone('/api/certificates/delete');
  });
});
