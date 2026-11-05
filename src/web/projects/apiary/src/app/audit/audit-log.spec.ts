import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { AuditEntry } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { byLabel, byRole, choose, settle, textOf, type } from '../testing/dom';
import { AuditLog } from './audit-log';

const now = new Date('2026-11-04T12:00:00Z');

function anEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'entry-1',
    at: '2026-11-04T10:15:00Z',
    user: 'ana@example.com',
    address: '10.0.0.5',
    action: 'routes.create',
    affected: [],
    outcome: 'succeeded',
    ...overrides,
  };
}

interface Rendered {
  readonly fixture: ComponentFixture<AuditLog>;
  readonly backend: HttpTestingController;
}

function filtered(backend: HttpTestingController): TestRequest[] {
  return backend
    .match('/api/audit/list')
    .filter((request) => 'from' in (request.request.body as object));
}

async function render(entries: AuditEntry[], everyone: AuditEntry[] = entries): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideErrorMessages(appMessages)],
  });
  const fixture = TestBed.createComponent(AuditLog);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.match('/api/audit/list').forEach((request) => {
    request.flush('from' in (request.request.body as object) ? entries : everyone);
  });
  await settle(fixture);
  return { fixture, backend };
}

async function nextFilter({ fixture, backend }: Rendered): Promise<TestRequest> {
  fixture.detectChanges();
  const request = await vi.waitFor(() => {
    const found = filtered(backend).filter((request) => !request.cancelled);
    expect(found).toHaveLength(1);
    return found[0];
  });
  request.flush([]);
  await settle(fixture);
  return request;
}

describe('AuditLog', () => {
  afterEach(() => vi.useRealTimers());

  it('asks for the last 7 days by default', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AuditLog);
    fixture.detectChanges();

    const [request] = filtered(TestBed.inject(HttpTestingController));

    expect(request.request.body).toEqual({
      from: '2026-10-28T12:00:00.000Z',
      to: null,
      user: null,
      failedOnly: false,
      via: null,
      search: null,
    });
  });

  it('says who did what, from where and when', async () => {
    const { fixture } = await render([anEntry()]);

    expect(textOf(fixture)).toContain(
      'Todayana@example.com created a route routes.create · from 10.0.0.510:15 UTC',
    );
  });

  it('groups the entries by day', async () => {
    const { fixture } = await render([
      anEntry({ id: 'entry-1' }),
      anEntry({ id: 'entry-2', at: '2026-11-03T09:00:00Z' }),
      anEntry({ id: 'entry-3', at: '2026-11-01T09:00:00Z' }),
    ]);

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('h3')].map((h) => h.textContent),
    ).toEqual(['Today', 'Yesterday', '2026-11-01']);
  });

  it('names the agent that acted for a person', async () => {
    const { fixture } = await render([anEntry({ client: 'Claude Code' })]);

    expect(textOf(fixture)).toContain(
      'Agent “Claude Code” for ana@example.com created a route routes.create · through MCP',
    );
  });

  it('names Apiary itself when no one acted', async () => {
    const { fixture } = await render([
      anEntry({ user: undefined, address: undefined, action: 'certificates.renew' }),
    ]);

    expect(textOf(fixture)).toContain('System renewed a certificate certificates.renew');
  });

  it('shows an action it has no words for as it is', async () => {
    const { fixture } = await render([anEntry({ action: 'something.new' })]);

    expect(textOf(fixture)).toContain('ana@example.com something.new something.new');
  });

  it.each([
    ['denied', 'Denied'],
    ['failed', 'Failed'],
  ] as const)('tags an entry that was %s', async (outcome, tag) => {
    const { fixture } = await render([anEntry({ outcome })]);

    expect((fixture.nativeElement as HTMLElement).querySelector('.ap-tag')?.textContent).toBe(tag);
  });

  it('offers each person who appears in the log', async () => {
    const { fixture } = await render(
      [],
      [anEntry({ user: 'rui@example.com' }), anEntry({ user: 'ana@example.com' }), anEntry()],
    );

    expect([...byLabel<HTMLSelectElement>(fixture, 'Person').options].map((o) => o.text)).toEqual([
      'Everyone',
      'ana@example.com',
      'rui@example.com',
    ]);
  });

  it('asks for a longer range', async () => {
    const rendered = await render([]);

    byRole(rendered.fixture, 'button', '1 year').click();
    const request = await nextFilter(rendered);

    expect(request.request.body.from).toBe('2025-11-04T12:00:00.000Z');
  });

  it('asks for one person’s entries', async () => {
    const rendered = await render([], [anEntry()]);

    choose(byLabel<HTMLSelectElement>(rendered.fixture, 'Person'), 'ana@example.com');
    const request = await nextFilter(rendered);

    expect(request.request.body.user).toBe('ana@example.com');
  });

  it('asks for what agents did', async () => {
    const rendered = await render([]);

    byRole(rendered.fixture, 'button', 'Agents').click();
    const request = await nextFilter(rendered);

    expect(request.request.body.via).toBe('agents');
  });

  it('asks only for what was denied or failed', async () => {
    const rendered = await render([]);

    (rendered.fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>('input[type="checkbox"]')
      ?.click();
    const request = await nextFilter(rendered);

    expect(request.request.body.failedOnly).toBe(true);
  });

  it('searches once typing stops', async () => {
    const rendered = await render([]);

    type(byLabel(rendered.fixture, 'Search the audit log'), ' 10.0.0.5 ');
    const request = await nextFilter(rendered);

    expect(request.request.body.search).toBe('10.0.0.5');
  });

  it('asks for a custom range once applied', async () => {
    const rendered = await render([]);
    byRole(rendered.fixture, 'button', 'Custom…').click();
    rendered.fixture.detectChanges();

    type(byLabel(rendered.fixture, 'From'), '2026-11-01 00:00');
    type(byLabel(rendered.fixture, 'Until'), '2026-11-02 00:00');
    byRole(rendered.fixture, 'button', 'Apply').click();
    const request = await nextFilter(rendered);

    expect([request.request.body.from, request.request.body.to]).toEqual([
      '2026-11-01T00:00:00.000Z',
      '2026-11-02T00:00:00.000Z',
    ]);
  });

  it('says when nothing matches, and clears the filters', async () => {
    const rendered = await render([]);
    byRole(rendered.fixture, 'button', 'Agents').click();
    await nextFilter(rendered);

    byRole(rendered.fixture, 'button', 'Clear filters').click();
    const request = await nextFilter(rendered);

    expect(request.request.body.via).toBeNull();
  });

  it('asks for what pipelines did, and names the pipeline', async () => {
    const rendered = await render([
      anEntry({ user: undefined, pipeline: 'shop-deploy', action: 'stacks.apply' }),
    ]);

    expect(textOf(rendered.fixture)).toContain('Pipeline shop-deploy applied a stack file');
    byRole(rendered.fixture, 'button', 'Pipelines').click();
    const request = await nextFilter(rendered);

    expect(request.request.body.via).toBe('pipelines');
  });
});
