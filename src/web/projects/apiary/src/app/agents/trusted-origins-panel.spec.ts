import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
import { TrustedOriginsPanel } from './trusted-origins-panel';

interface Rendered {
  readonly fixture: ComponentFixture<TrustedOriginsPanel>;
  readonly backend: HttpTestingController;
}

async function render(trustedOrigins: string[] = []): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideErrorMessages(appMessages)],
  });
  const fixture = TestBed.createComponent(TrustedOriginsPanel);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/agents/policy').flush({ trustedOrigins });
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend };
}

async function save({ fixture }: Rendered, origins: string): Promise<void> {
  type(byLabel<HTMLTextAreaElement>(fixture, 'Trusted sites (optional)'), origins);
  await settle(fixture);
  byRole(fixture, 'button', 'Save').click();
  await settle(fixture);
}

describe('TrustedOriginsPanel', () => {
  it('shows the trusted sites one per line', async () => {
    const { fixture } = await render(['https://a.example.com', 'https://b.example.com']);

    expect(byLabel<HTMLTextAreaElement>(fixture, 'Trusted sites (optional)').value).toBe(
      'https://a.example.com\nhttps://b.example.com',
    );
  });

  it('sends the sites without blank lines or spaces', async () => {
    const panel = await render();

    await save(panel, ' https://a.example.com \n\nhttps://b.example.com');
    const request = await nextRequest(panel.backend, '/api/agents/update-policy');

    expect(request.request.body).toEqual({
      trustedOrigins: ['https://a.example.com', 'https://b.example.com'],
    });
  });

  it.each([
    'http://agents.example.com',
    'https://agents.example.com/path',
    'https://agents.example.com/?q=1',
    'https://user@agents.example.com',
    'agents.example.com',
  ])('refuses %s as a trusted site', async (origin) => {
    const panel = await render();

    await save(panel, origin);

    expect(errorOf(panel.fixture, 'Trusted sites (optional)')).toBe(
      'Enter HTTPS addresses without a path, one per line, such as https://agents.example.com.',
    );
  });

  it('refuses more than 20 sites', async () => {
    const panel = await render();
    const origins = [...Array(21).keys()].map((n) => `https://agent${n}.example.com`);

    await save(panel, origins.join('\n'));

    expect(errorOf(panel.fixture, 'Trusted sites (optional)')).toBe('List 20 sites at most.');
  });

  it('says agents can connect from the sites listed', async () => {
    const panel = await render();

    await save(panel, 'https://agents.example.com');
    (await nextRequest(panel.backend, '/api/agents/update-policy')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Agents can connect from the sites listed, and from people’s own computers.',
      ),
    );
  });

  it('says agents can only connect from people’s own computers without sites', async () => {
    const panel = await render(['https://agents.example.com']);

    await save(panel, '');
    (await nextRequest(panel.backend, '/api/agents/update-policy')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Agents can only connect from people’s own computers.',
      ),
    );
  });

  it('shows the API’s error on the sites field', async () => {
    const panel = await render();

    await save(panel, 'https://agents.example.com');
    (await nextRequest(panel.backend, '/api/agents/update-policy')).flush(
      aProblem(400, 'validation.failed', [
        { field: 'trustedOrigins', code: 'agent.originInvalid' },
      ]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(panel.fixture);

    expect(errorOf(panel.fixture, 'Trusted sites (optional)')).toBe(
      'Enter HTTPS addresses without a path, one per line, such as https://agents.example.com.',
    );
  });
});
