import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster } from '@datapoint/apiary-ui';
import { AgentView, Role } from '../api/models';
import { Auth } from '../auth/auth';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aSignedInUser } from '../testing/builders';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { AgentList } from './agent-list';

const now = new Date('2026-11-04T12:00:00Z');

function anAgent(overrides: Partial<AgentView> = {}): AgentView {
  return {
    id: 'agent-1',
    name: 'Claude Code',
    connectedAt: '2026-10-01T10:00:00Z',
    lastUsedAt: '2026-11-04T11:00:00Z',
    endsAt: '2026-12-30T10:00:00Z',
    mine: true,
    ...overrides,
  };
}

interface Rendered {
  readonly fixture: ComponentFixture<AgentList>;
  readonly backend: HttpTestingController;
  readonly confirmer: AcceptingConfirmer;
}

async function render(agents: AgentView[], role: Role = 'operator'): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(AgentList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/agents/list').flush(agents);
  backend.match('/api/agents/policy').forEach((request) => request.flush({ trustedOrigins: [] }));
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, confirmer };
}

afterEach(() => vi.useRealTimers());

describe('AgentList', () => {
  it('shows each agent, for whom, when it connected, was last active and stays connected', async () => {
    const { fixture } = await render([anAgent()]);

    expect(cellsOfRow(fixture, 'Claude Code')).toEqual([
      'Claude Code',
      'You',
      '2026-10-01 10:00 UTC',
      '1 hour ago',
      '2026-12-30 10:00 UTC',
      'Disconnect…',
    ]);
  });

  it('names the person another agent acts for', async () => {
    const { fixture } = await render(
      [anAgent({ mine: false, user: 'Rui Costa' })],
      'administrator',
    );

    expect(cellsOfRow(fixture, 'Claude Code')[1]).toBe('Rui Costa');
  });

  it.each([
    ['administrator', 'Everyone’s agents'],
    ['operator', 'Your agents'],
  ] as const)('shows an %s the right agents heading', async (role, heading) => {
    const { fixture } = await render([], role);

    expect(byRole(fixture, 'heading', heading)).toBeTruthy();
  });

  it('explains how to connect the first agent', async () => {
    const { fixture } = await render([]);

    expect(byRole(fixture, 'heading', 'No agents connected')).toBeTruthy();
  });

  it('gives the command to connect Claude Code to this Apiary', async () => {
    const { fixture } = await render([]);

    expect(textOf(fixture)).toContain(
      `claude mcp add --transport http apiary ${location.origin}/mcp`,
    );
  });

  it('says the agent acts with the user’s role', async () => {
    const { fixture } = await render([], 'viewer');

    expect(textOf(fixture)).toContain('It appears here, and acts with your role: Viewer.');
  });

  it('shows the trusted sites to administrators only', async () => {
    const { fixture } = await render([], 'operator');

    expect(queryByRole(fixture, 'heading', 'Web-based agents')).toBeUndefined();
  });

  it('disconnects an agent once confirmed', async () => {
    const { fixture, backend } = await render([anAgent()]);

    byRole(fixture, 'button', 'Disconnect…').click();
    const request = await nextRequest(backend, '/api/agents/disconnect');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'agent-1' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Claude Code can no longer reach Apiary.',
      ),
    );
  });

  it('says who can connect someone else’s agent again', async () => {
    const { fixture, confirmer } = await render(
      [anAgent({ mine: false, user: 'Rui Costa' })],
      'administrator',
    );

    byRole(fixture, 'button', 'Disconnect…').click();
    await settle(fixture);

    expect(confirmer.asked[0].text).toBe(
      'It loses access at once, including any task it’s running. Rui Costa can connect it again.',
    );
  });
});
