import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { AgentClientView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser } from '../testing/builders';
import { byRole, queryByRole, settle, textOf } from '../testing/dom';
import { ConnectAgent } from './connect-agent';

const query = {
  client_id: 'client-1',
  redirect_uri: 'http://127.0.0.1:33418/callback',
  code_challenge: 'challenge',
  code_challenge_method: 'S256',
  state: 'state-1',
};
const claude: AgentClientView = {
  name: 'Claude Code',
  redirectUri: 'http://127.0.0.1:33418/callback',
  returnsTo: '127.0.0.1',
  returnsToThisComputer: true,
};

interface Rendered {
  readonly fixture: ComponentFixture<ConnectAgent>;
  readonly backend: HttpTestingController;
}

function setUp(params: Record<string, string> = query): Rendered {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
      },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ email: 'ana@example.com', role: 'operator' }));
  const fixture = TestBed.createComponent(ConnectAgent);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, backend };
}

async function render(client: AgentClientView = claude): Promise<Rendered> {
  const page = setUp();
  page.backend.expectOne('/api/agents/client').flush(client);
  await settle(page.fixture);
  return page;
}

describe('ConnectAgent', () => {
  it('asks the provider about the agent’s client and return address', () => {
    const { backend } = setUp();

    expect(backend.expectOne('/api/agents/client').request.body).toEqual({
      clientId: 'client-1',
      redirectUri: 'http://127.0.0.1:33418/callback',
    });
  });

  it('names the agent and who it acts as', async () => {
    const { fixture } = await render();

    expect([byRole(fixture, 'heading', 'Connect Claude Code?'), textOf(fixture)]).toEqual([
      expect.anything(),
      expect.stringContaining('It acts as ana@example.com, with your role: Operator.'),
    ]);
  });

  it('warns about an agent that returns to a website', async () => {
    const { fixture } = await render({
      ...claude,
      returnsTo: 'agents.example.com',
      returnsToThisComputer: false,
    });

    expect(textOf(fixture)).toContain('It returns to a website');
  });

  it('doesn’t warn about an agent on this computer', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).not.toContain('It returns to a website');
  });

  it('explains why an unknown agent can’t connect', async () => {
    const page = setUp();
    page.backend
      .expectOne('/api/agents/client')
      .flush(aProblem(400, 'agent.redirectInvalid'), { status: 400, statusText: 'Bad Request' });
    await settle(page.fixture);

    expect(textOf(page.fixture)).toContain(
      'This agent runs on a site Apiary doesn’t trust. An Administrator can add the site on the Connected agents page.',
    );
  });

  it('explains an error the sign-in passed on', async () => {
    const page = setUp({ ...query, error: 'agent.challengeInvalid' });
    page.backend.expectOne('/api/agents/client').flush(claude);
    await settle(page.fixture);

    expect([
      byRole(page.fixture, 'heading', 'This agent can’t connect'),
      textOf(page.fixture),
    ]).toEqual([
      expect.anything(),
      expect.stringContaining(
        'The agent’s request is missing its security check (PKCE with S256).',
      ),
    ]);
  });

  it('sends the agent’s request when approved', async () => {
    const page = await render();

    byRole(page.fixture, 'button', 'Connect').click();
    const request = await nextRequest(page.backend, '/api/agents/connect');

    expect(request.request.body).toEqual({
      clientId: 'client-1',
      redirectUri: 'http://127.0.0.1:33418/callback',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      state: 'state-1',
    });
  });

  it('explains why the agent wasn’t connected', async () => {
    const page = await render();

    byRole(page.fixture, 'button', 'Connect').click();
    (await nextRequest(page.backend, '/api/agents/connect')).flush(aProblem(409, 'agent.tooMany'), {
      status: 409,
      statusText: 'Conflict',
    });
    await settle(page.fixture);

    expect([textOf(page.fixture), queryByRole(page.fixture, 'button', 'Connect')]).toEqual([
      expect.stringContaining('You have 20 agents connected, the most Apiary allows.'),
      expect.anything(),
    ]);
  });
});
