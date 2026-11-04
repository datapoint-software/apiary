import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { SessionView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { allByRole, byRole, queryByRole, settle, textOf } from '../testing/dom';
import { Sessions } from './sessions';

function aSession(overrides: Partial<SessionView> = {}): SessionView {
  return {
    id: 'session-1',
    device: 'Firefox on macOS',
    address: '192.0.2.10',
    startedAt: '2026-11-04T08:00:00Z',
    expiresAt: '2026-11-04T20:00:00Z',
    current: false,
    ...overrides,
  };
}

const here = aSession({ id: 'session-1', device: 'Firefox on macOS', current: true });
const phone = aSession({ id: 'session-2', device: 'Safari on iPhone', address: '198.51.100.7' });

interface Rendered {
  readonly fixture: ComponentFixture<Sessions>;
  readonly backend: HttpTestingController;
  readonly confirmer: AcceptingConfirmer;
}

async function render(sessions: SessionView[]): Promise<Rendered> {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideErrorMessages(appMessages),
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  const fixture = TestBed.createComponent(Sessions);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/account/sessions').flush(sessions);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, confirmer };
}

describe('Sessions', () => {
  it('shows where and when each session signed in', async () => {
    const { fixture } = await render([phone]);

    expect(textOf(fixture)).toContain(
      'Safari on iPhone 198.51.100.7 · signed in 2026-11-04 08:00 UTC',
    );
  });

  it('marks this browser’s session', async () => {
    const { fixture } = await render([here]);

    expect(textOf(fixture)).toContain('Firefox on macOS This browser');
  });

  it('describes a session it knows little about', async () => {
    const { fixture } = await render([aSession({ device: undefined, address: undefined })]);

    expect(textOf(fixture)).toContain('Unknown browser unknown address');
  });

  it('offers to sign out only the other sessions', async () => {
    const { fixture } = await render([here, phone]);

    expect(allByRole(fixture, 'button')).toEqual(['Sign out of all others…', 'Sign out']);
  });

  it('offers nothing to sign out when this is the only session', async () => {
    const { fixture } = await render([here]);

    expect(queryByRole(fixture, 'button', 'Sign out of all others…')).toBeUndefined();
  });

  it('signs out a session', async () => {
    const sessions = await render([here, phone]);

    byRole(sessions.fixture, 'button', 'Sign out').click();
    const request = await nextRequest(sessions.backend, '/api/account/end-session');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'session-2' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Safari on iPhone is signed out.'),
    );
  });

  it('confirms an unknown session is signed out', async () => {
    const sessions = await render([here, aSession({ id: 'session-3', device: undefined })]);

    byRole(sessions.fixture, 'button', 'Sign out').click();
    (await nextRequest(sessions.backend, '/api/account/end-session')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('That session is signed out.'),
    );
  });

  it('explains why a session wasn’t signed out', async () => {
    const sessions = await render([here, phone]);

    byRole(sessions.fixture, 'button', 'Sign out').click();
    (await nextRequest(sessions.backend, '/api/account/end-session')).flush(
      aProblem(404, 'session.notFound'),
      { status: 404, statusText: 'Not Found' },
    );

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        text: 'That session already ended.',
        tone: 'error',
      }),
    );
  });

  it('counts the other sessions it signs out', async () => {
    const sessions = await render([here, phone, aSession({ id: 'session-3' })]);

    byRole(sessions.fixture, 'button', 'Sign out of all others…').click();
    await settle(sessions.fixture);

    expect(sessions.confirmer.asked[0].text).toBe(
      '2 other sessions end at once. You stay signed in here.',
    );
  });

  it('signs out every other session once confirmed', async () => {
    const sessions = await render([here, phone]);

    byRole(sessions.fixture, 'button', 'Sign out of all others…').click();
    (await nextRequest(sessions.backend, '/api/account/end-other-sessions')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Only this browser is signed in now.'),
    );
  });
});
