import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { BackupStatus } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import { byRole, definitionOf, settle, textOf } from '../testing/dom';
import { RefusingConfirmer } from '../testing/refusing-confirmer';
import { BackupPage } from './backup-page';
import { maximumBackupSize } from './backup-files';

const now = new Date('2026-11-04T12:00:00Z');
const recent: BackupStatus = {
  lastAt: '2026-11-03T12:00:00Z',
  lastBy: 'Ana Silva',
  changesSince: 4,
};

interface Rendered {
  readonly fixture: ComponentFixture<BackupPage>;
  readonly backend: HttpTestingController;
}

async function render(
  status: BackupStatus,
  confirmer: AcceptingConfirmer | RefusingConfirmer = new AcceptingConfirmer(),
): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'sign-in', children: [] }]),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser());
  const fixture = TestBed.createComponent(BackupPage);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/backups/status').flush(status);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend };
}

function chooseFile({ fixture }: Rendered, file: File): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

function catchDownloads(): { readonly names: string[]; readonly blobs: Blob[] } {
  const caught = { names: [] as string[], blobs: [] as Blob[] };
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      caught.blobs.push(blob);
      return 'blob:backup';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    caught.names.push(this.download);
  });
  return caught;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('BackupPage', () => {
  it('shows when the last backup was taken, by whom and the changes since', async () => {
    const { fixture } = await render(recent);

    expect(['Taken', 'By', 'Changes since'].map((term) => definitionOf(fixture, term))).toEqual([
      '2026-11-03 12:00 UTC, yesterday',
      'Ana Silva',
      '4',
    ]);
  });

  it('says Apiary took a backup nobody asked for', async () => {
    const { fixture } = await render({ ...recent, lastBy: undefined });

    expect(definitionOf(fixture, 'By')).toBe('Apiary');
  });

  it('warns when there are no backups yet', async () => {
    const { fixture } = await render({ changesSince: 12 });

    expect(textOf(fixture)).toContain('There are no backups yet');
  });

  it('warns when the last backup is over a week old', async () => {
    const { fixture } = await render({ ...recent, lastAt: '2026-10-20T12:00:00Z' });

    expect(textOf(fixture)).toContain('The last backup is 15 days ago');
  });

  it('doesn’t warn about a recent backup', async () => {
    const { fixture } = await render(recent);

    expect(textOf(fixture)).not.toContain('If the cluster were lost now');
  });

  it('downloads the backup it takes', async () => {
    const downloads = catchDownloads();
    const page = await render(recent);

    byRole(page.fixture, 'button', 'Back up now').click();
    (await nextRequest(page.backend, '/api/backups/export')).flush({
      name: 'apiary-2026-11-04.backup',
      content: 'encrypted',
      index: 42,
    });

    await vi.waitFor(() => expect(downloads.names).toEqual(['apiary-2026-11-04.backup']));
    expect(await downloads.blobs[0].text()).toBe('encrypted');
  });

  it('reminds to store the backup with the root key', async () => {
    catchDownloads();
    const page = await render(recent);

    byRole(page.fixture, 'button', 'Back up now').click();
    (await nextRequest(page.backend, '/api/backups/export')).flush({
      name: 'apiary-2026-11-04.backup',
      content: 'encrypted',
      index: 42,
    });

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Backup taken',
        text: 'apiary-2026-11-04.backup is downloading. Store it with the root key, apart from the cluster.',
      }),
    );
  });

  it('asks to back up again when the file was lost', async () => {
    const page = await render(recent);

    byRole(page.fixture, 'button', 'Back up now').click();
    (await nextRequest(page.backend, '/api/backups/export')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        text: 'The backup was taken, but its file was lost while the leader changed. Back up again.',
        tone: 'error',
      }),
    );
  });

  it('explains why it couldn’t back up', async () => {
    const page = await render(recent);

    byRole(page.fixture, 'button', 'Back up now').click();
    (await nextRequest(page.backend, '/api/backups/export')).flush(
      aProblem(503, 'cluster.noQuorum'),
      { status: 503, statusText: 'Service Unavailable' },
    );

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Couldn’t back up',
        text: 'Changes are paused while the cluster can’t reach a majority of voters. Try again once it recovers.',
      }),
    );
  });

  it('says when Apiary didn’t answer the backup', async () => {
    const page = await render(recent);

    byRole(page.fixture, 'button', 'Back up now').click();
    (await nextRequest(page.backend, '/api/backups/export')).error(new ProgressEvent('error'));

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Apiary didn’t answer. Check your connection and try again.',
      ),
    );
  });

  it('asks to type restore before restoring a backup', async () => {
    const confirmer = new RefusingConfirmer();
    const page = await render(recent, confirmer);

    chooseFile(page, new File(['encrypted'], 'apiary-2026-11-01.backup'));

    await vi.waitFor(() =>
      expect(confirmer.asked[0]).toMatchObject({
        heading: 'Restore apiary-2026-11-01.backup?',
        typeToConfirm: 'restore',
        tone: 'danger',
      }),
    );
    page.backend.expectNone('/api/backups/restore');
  });

  it('sends the backup file’s content', async () => {
    const page = await render(recent);

    chooseFile(page, new File(['encrypted'], 'apiary-2026-11-01.backup'));
    const request = await nextRequest(page.backend, '/api/backups/restore');

    expect(request.request.body).toEqual({ content: 'encrypted' });
  });

  it('signs everyone out once the backup is restored', async () => {
    const page = await render(recent);

    chooseFile(page, new File(['encrypted'], 'apiary-2026-11-01.backup'));
    (await nextRequest(page.backend, '/api/backups/restore')).flush({
      takenAt: '2026-11-01T09:30:00Z',
      routes: 12,
      certificates: 1,
      users: 3,
    });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/sign-in'));
    expect([TestBed.inject(Auth).user(), TestBed.inject(Toaster).toasts()[0].text]).toEqual([
      null,
      'Back to 2026-11-01 09:30 UTC: 12 routes, 1 certificate, 3 users. Sign in again.',
    ]);
  });

  it('refuses a file too large to be a backup', async () => {
    const page = await render(recent);
    const file = new File(['x'], 'huge.backup');
    Object.defineProperty(file, 'size', { value: maximumBackupSize + 1 });

    chooseFile(page, file);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'This file isn’t a backup this cluster can open. Choose a file Apiary exported, from a cluster with the same root key.',
      ),
    );
  });
});
