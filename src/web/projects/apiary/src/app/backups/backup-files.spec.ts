import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { restoreBackup } from './backup-files';

function setUp() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(Api), backend: TestBed.inject(HttpTestingController) };
}

const refused = { status: 400, statusText: 'Bad Request' };

describe('restoreBackup', () => {
  it('sends the content to the action given', async () => {
    const { api, backend } = setUp();

    const restoring = restoreBackup(api, 'setup.restore', 'encrypted');
    const request = await nextRequest(backend, '/api/setup/restore');
    request.flush({ takenAt: '2026-11-01T09:30:00Z', routes: 1, certificates: 0, users: 1 });

    expect([request.request.body, await restoring]).toEqual([
      { content: 'encrypted' },
      { takenAt: '2026-11-01T09:30:00Z', routes: 1, certificates: 0, users: 1 },
    ]);
  });

  it('reports an unreadable file as a problem with the whole backup', async () => {
    const { api, backend } = setUp();

    const restoring = restoreBackup(api, 'backups.restore', 'garbage');
    (await nextRequest(backend, '/api/backups/restore')).flush(
      aProblem(400, 'validation.failed', [{ field: 'content', code: 'backup.unreadable' }]),
      refused,
    );

    await expect(restoring).rejects.toEqual({ status: 400, code: 'backup.unreadable' });
  });

  it('passes on any other problem', async () => {
    const { api, backend } = setUp();

    const restoring = restoreBackup(api, 'backups.restore', 'encrypted');
    (await nextRequest(backend, '/api/backups/restore')).flush(aProblem(403, 'auth.forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(restoring).rejects.toEqual(aProblem(403, 'auth.forbidden'));
  });
});
