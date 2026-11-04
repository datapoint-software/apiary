import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { SsoSettingsView } from '../api/models';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem } from '../testing/builders';
import { byLabel, byRole, errorOf, settle, textOf, type } from '../testing/dom';
import { SsoSettings } from './sso-settings';

const now = new Date('2026-11-04T12:00:00Z');

const notSetUp: SsoSettingsView = {
  enabled: false,
  displayName: '',
  issuer: '',
  clientId: '',
  hasClientSecret: false,
  groupsClaim: 'groups',
  administratorGroups: [],
  operatorGroups: [],
  viewerGroups: [],
};
const keycloak: SsoSettingsView = {
  enabled: true,
  displayName: 'Keycloak',
  issuer: 'https://login.example.com/realms/staff',
  clientId: 'apiary',
  hasClientSecret: true,
  groupsClaim: 'groups',
  administratorGroups: ['platform', 'sre'],
  operatorGroups: ['developers'],
  viewerGroups: [],
  changedAt: '2026-11-04T10:00:00Z',
};

interface Rendered {
  readonly fixture: ComponentFixture<SsoSettings>;
  readonly backend: HttpTestingController;
}

async function render(view: SsoSettingsView = notSetUp): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideErrorMessages(appMessages)],
  });
  const fixture = TestBed.createComponent(SsoSettings);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/sso/get').flush(view);
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend };
}

async function fillIn({ fixture }: Rendered, label: string, value: string): Promise<void> {
  type(byLabel<HTMLInputElement | HTMLTextAreaElement>(fixture, label), value);
  await settle(fixture);
}

async function save({ fixture }: Rendered): Promise<void> {
  byRole(fixture, 'button', 'Save single sign-on').click();
  await settle(fixture);
}

async function setUpKeycloak(page: Rendered): Promise<void> {
  await fillIn(page, 'Name on the sign-in button', ' Keycloak ');
  await fillIn(page, 'Issuer', ' https://login.example.com/realms/staff ');
  await fillIn(page, 'Client id', ' apiary ');
  await fillIn(page, 'Client secret', 's3cret');
  await fillIn(page, 'Administrators (optional)', 'platform\n\n sre ');
}

function offerSwitch(fixture: ComponentFixture<SsoSettings>): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement;
}

afterEach(() => vi.useRealTimers());

describe('SsoSettings', () => {
  it('says single sign-on isn’t set up yet', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain('Not set up yet');
  });

  it('says when the settings last changed', async () => {
    const { fixture } = await render(keycloak);

    expect(textOf(fixture)).toContain('Changed 2 hours ago');
  });

  it('gives the redirect URI to register at the provider', async () => {
    const { fixture } = await render();

    expect(textOf(fixture)).toContain(`${location.origin}/auth/sso/callback`);
  });

  it('shows the saved settings with one group per line', async () => {
    const { fixture } = await render(keycloak);

    expect([
      byLabel(fixture, 'Issuer').value,
      byLabel<HTMLTextAreaElement>(fixture, 'Administrators (optional)').value,
    ]).toEqual(['https://login.example.com/realms/staff', 'platform\nsre']);
  });

  it('never shows the saved client secret', async () => {
    const { fixture } = await render(keycloak);

    expect([byLabel(fixture, 'Client secret (optional)').value, textOf(fixture)]).toEqual([
      '',
      expect.stringContaining('Saved. Leave it empty to keep it.'),
    ]);
  });

  it('asks for the name, issuer and client id', async () => {
    const page = await render();

    await save(page);

    expect(
      ['Name on the sign-in button', 'Issuer', 'Client id'].map((label) =>
        errorOf(page.fixture, label),
      ),
    ).toEqual(['Fill this in.', 'Fill this in.', 'Fill this in.']);
    page.backend.expectNone('/api/sso/update');
  });

  it('sends trimmed settings and groups', async () => {
    const page = await render();
    await setUpKeycloak(page);
    offerSwitch(page.fixture).click();
    await settle(page.fixture);

    await save(page);
    const request = await nextRequest(page.backend, '/api/sso/update');

    expect(request.request.body).toEqual({
      enabled: true,
      displayName: 'Keycloak',
      issuer: 'https://login.example.com/realms/staff',
      clientId: 'apiary',
      clientSecret: 's3cret',
      groupsClaim: 'groups',
      administratorGroups: ['platform', 'sre'],
      operatorGroups: [],
      viewerGroups: [],
    });
  });

  it('keeps the saved client secret when the field is left empty', async () => {
    const page = await render(keycloak);
    await fillIn(page, 'Client id', 'apiary-2');

    await save(page);
    const request = await nextRequest(page.backend, '/api/sso/update');

    expect(request.request.body.clientSecret).toBeNull();
  });

  it('says the sign-in page offers single sign-on once saved', async () => {
    const page = await render(keycloak);
    await fillIn(page, 'Client id', 'apiary-2');

    await save(page);
    (await nextRequest(page.backend, '/api/sso/update')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Single sign-on saved. The sign-in page offers it now.',
      ),
    );
  });

  it('says single sign-on is off once saved without offering it', async () => {
    const page = await render();
    await setUpKeycloak(page);

    await save(page);
    (await nextRequest(page.backend, '/api/sso/update')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Single sign-on saved. It’s off.'),
    );
  });

  it('shows the API’s error on the field it names', async () => {
    const page = await render();
    await setUpKeycloak(page);

    await save(page);
    (await nextRequest(page.backend, '/api/sso/update')).flush(
      aProblem(400, 'validation.failed', [{ field: 'issuer', code: 'sso.issuerInvalid' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(page.fixture);

    expect(errorOf(page.fixture, 'Issuer')).toBe(
      'Enter the provider’s issuer as an HTTPS address, such as https://login.example.com/realms/staff.',
    );
  });
});
