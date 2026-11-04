import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { appMessages } from '../errors/app-messages';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { byLabel, byRole, errorOf, settle, type } from '../testing/dom';
import { SessionPolicyPanel } from './session-policy-panel';

interface Rendered {
  readonly fixture: ComponentFixture<SessionPolicyPanel>;
  readonly backend: HttpTestingController;
}

async function render(): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideErrorMessages(appMessages)],
  });
  const fixture = TestBed.createComponent(SessionPolicyPanel);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/users/session-policy').flush({ idleMinutes: 30 });
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend };
}

async function saveMinutes({ fixture }: Rendered, minutes: string): Promise<void> {
  type(byLabel(fixture, 'Sign out after'), minutes);
  await settle(fixture);
  byRole(fixture, 'button', 'Save').click();
  await settle(fixture);
}

describe('SessionPolicyPanel', () => {
  it('shows the current time before signing out', async () => {
    const { fixture } = await render();

    expect(byLabel(fixture, 'Sign out after').value).toBe('30');
  });

  it('sends the new time', async () => {
    const panel = await render();

    await saveMinutes(panel, '60');
    const request = await nextRequest(panel.backend, '/api/users/update-session-policy');

    expect(request.request.body).toEqual({ idleMinutes: 60 });
  });

  it('confirms the new time once saved', async () => {
    const panel = await render();

    await saveMinutes(panel, '60');
    (await nextRequest(panel.backend, '/api/users/update-session-policy')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        heading: 'Saved',
        text: 'People are signed out after 60 minutes without activity.',
      }),
    );
  });

  it.each(['4', '721', '7.5'])('refuses %s minutes', async (minutes) => {
    const panel = await render();

    await saveMinutes(panel, minutes);

    expect(errorOf(panel.fixture, 'Sign out after')).toBe('Enter a number from 5 to 720.');
    panel.backend.expectNone('/api/users/update-session-policy');
  });

  it('shows the API’s error on the field it names', async () => {
    const panel = await render();

    await saveMinutes(panel, '60');
    (await nextRequest(panel.backend, '/api/users/update-session-policy')).flush(
      {
        status: 400,
        code: 'validation.failed',
        errors: [{ field: 'idleMinutes', code: 'range', params: { min: 5, max: 720 } }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(panel.fixture);

    expect(errorOf(panel.fixture, 'Sign out after')).toBe('Enter a number from 5 to 720.');
  });
});
