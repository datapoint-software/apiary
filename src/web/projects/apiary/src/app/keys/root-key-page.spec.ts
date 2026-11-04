import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RootKeyStatus } from '../api/models';
import { cellsOfRow, definitionOf, settle, textOf } from '../testing/dom';
import { version } from '../version';
import { RootKeyPage } from './root-key-page';

const now = new Date('2026-11-04T12:00:00Z');

const settled: RootKeyStatus = {
  current: 'key-a',
  currentSince: '2026-10-01T12:00:00Z',
  replicas: [
    { id: 'replica-1', node: 'node-a', rootKeyId: 'key-a' },
    { id: 'replica-2', node: 'node-b', rootKeyId: 'key-a' },
  ],
};
const rotating: RootKeyStatus = {
  current: 'key-a',
  target: 'key-b',
  targetSince: '2026-11-04T11:50:00Z',
  replicas: [
    { id: 'replica-1', node: 'node-a', rootKeyId: 'key-b' },
    { id: 'replica-2', node: 'node-b', rootKeyId: 'key-a' },
    { id: 'replica-3', node: 'node-c' },
  ],
};

async function render(status: RootKeyStatus): Promise<ComponentFixture<RootKeyPage>> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(RootKeyPage);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/keys/status').flush(status);
  await settle(fixture);
  return fixture;
}

function progress(fixture: ComponentFixture<RootKeyPage>): (string | null)[] {
  const bar = (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]');
  return [bar?.getAttribute('aria-valuenow') ?? null, bar?.getAttribute('aria-valuemax') ?? null];
}

afterEach(() => vi.useRealTimers());

describe('RootKeyPage', () => {
  it('shows this replica’s key, since when and how many replicas use it', async () => {
    const fixture = await render(settled);

    expect(
      ['Key ID', 'Known since', 'Replicas using it'].map((term) => definitionOf(fixture, term)),
    ).toEqual(['key-a', '2026-10-01 12:00 UTC, 34 days ago', '2 of 2']);
  });

  it('explains how to rotate the key when no rotation is running', async () => {
    const fixture = await render(settled);

    expect(textOf(fixture)).toContain(
      'Not running Rotate the key if it may have leaked, or as your policy requires.',
    );
  });

  it('gives the command to create a new key with this version', async () => {
    const fixture = await render(settled);

    expect(textOf(fixture)).toContain(
      `docker run --rm datapointsoftware/apiary:${version} secrets init`,
    );
  });

  it('shows how many replicas use the new key during a rotation', async () => {
    const fixture = await render(rotating);

    expect(progress(fixture)).toEqual(['1', '3']);
  });

  it('marks the replicas still on the old key', async () => {
    const fixture = await render(rotating);

    expect(cellsOfRow(fixture, 'node-b')).toEqual(['node-b', 'key-a (old)']);
  });

  it('says when a replica hasn’t reported its key', async () => {
    const fixture = await render(rotating);

    expect(cellsOfRow(fixture, 'node-c')).toEqual([
      'node-c',
      'Not reported yet; it reports when it restarts',
    ]);
  });

  it('doesn’t warn about a rotation that just started', async () => {
    const fixture = await render(rotating);

    expect(textOf(fixture)).not.toContain('The rotation hasn’t finished');
  });

  it('warns about a rotation stalled for over half an hour', async () => {
    const fixture = await render({ ...rotating, targetSince: '2026-11-04T11:00:00Z' });

    expect(textOf(fixture)).toContain(
      'It started 1 hour ago, and 2 of 3 replicas still use another key. Check that the stack was deployed with the new secret, and that these replicas restarted: node-b, node-c.',
    );
  });
});
