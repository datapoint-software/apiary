import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmer, Toaster, provideErrorMessages } from '@datapoint/apiary-ui';
import { UserView } from '../api/models';
import { Auth } from '../auth/auth';
import { appMessages } from '../errors/app-messages';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { answerClusterStatus, nextRequest } from '../testing/backend';
import { aProblem, aSignedInUser, aUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import {
  byRole,
  cellsOfRow,
  definitionOf,
  menuItem,
  menuItemNames,
  settle,
  textOf,
} from '../testing/dom';
import { InviteDialog } from './invite-dialog';
import { InviteLinkDialog } from './invite-link-dialog';
import { RoleDialog } from './role-dialog';
import { UserList } from './user-list';

const me = aSignedInUser({ id: 'user-1', name: 'Ana Silva', email: 'ana@example.com' });
const now = new Date('2026-11-04T12:00:00Z');

interface Rendered {
  readonly fixture: ComponentFixture<UserList>;
  readonly backend: HttpTestingController;
  readonly dialog: ClosingDialog;
  readonly confirmer: AcceptingConfirmer;
}

async function render(users: UserView[], dialog = new ClosingDialog()): Promise<Rendered> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideErrorMessages(appMessages),
      { provide: Dialog, useValue: dialog },
      { provide: Confirmer, useValue: confirmer },
    ],
  });
  TestBed.inject(Auth).user.set(me);
  const fixture = TestBed.createComponent(UserList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/users/list').flush(users);
  backend.expectOne('/api/users/session-policy').flush({ idleMinutes: 30 });
  await answerClusterStatus(backend);
  await settle(fixture);
  return { fixture, backend, dialog, confirmer };
}

async function openActions({ fixture }: Rendered, name: string): Promise<void> {
  byRole(fixture, 'button', `Actions for ${name}`).click();
  await settle(fixture);
}

async function pick({ fixture }: Rendered, item: string): Promise<void> {
  menuItem(item).click();
  await settle(fixture);
}

function tagsOf(fixture: ComponentFixture<UserList>, email: string): string[] {
  const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')];
  const row = rows.find((r) => r.textContent?.includes(email));
  return [...(row?.querySelectorAll('.ap-tag') ?? [])].map((tag) => tag.textContent?.trim() ?? '');
}

const rui = aUser({ id: 'user-2', name: 'Rui Costa', email: 'rui@example.com' });
const invited = aUser({
  id: 'user-3',
  name: 'Eva Lima',
  email: 'eva@example.com',
  status: 'invited',
  twoStepOn: false,
  inviteExpiresAt: '2026-11-07T12:00:00Z',
});

afterEach(() => vi.useRealTimers());

describe('UserList', () => {
  it('shows each user’s initials, name, email and role', async () => {
    const { fixture } = await render([
      aUser({ name: 'Rui Pedro Costa', email: 'rui@example.com', role: 'operator' }),
    ]);

    expect(cellsOfRow(fixture, 'rui@example.com').slice(0, 2)).toEqual([
      'RP Rui Pedro Costa rui@example.com',
      'Operator',
    ]);
  });

  it('tags the signed-in user’s own row as theirs', async () => {
    const { fixture } = await render([
      aUser({ id: 'user-1', name: 'Ana Silva', email: 'ana@example.com' }),
    ]);

    expect(tagsOf(fixture, 'ana@example.com')).toEqual(['You']);
  });

  it('tags users who sign in with single sign-on', async () => {
    const { fixture } = await render([aUser({ email: 'rui@example.com', singleSignOn: true })]);

    expect(tagsOf(fixture, 'rui@example.com')).toEqual(['Single sign-on']);
  });

  it.each([
    ['set it up', aUser({ status: 'active', twoStepOn: true }), 'On'],
    ['haven’t set it up', aUser({ status: 'active', twoStepOn: false }), 'Not set up'],
    [
      'sign in with single sign-on',
      aUser({ singleSignOn: true, twoStepOn: false }),
      'At the identity provider',
    ],
    ['are only invited', aUser({ status: 'invited', twoStepOn: false }), '–'],
  ])('shows the two-step sign-in of users who %s', async (situation, user, expected) => {
    const { fixture } = await render([user]);

    expect(cellsOfRow(fixture, user.email)[2]).toBe(expected);
  });

  it('counts the active users who must set up two-step sign-in', async () => {
    const { fixture } = await render([
      aUser({ id: 'user-2', email: 'rui@example.com', twoStepOn: false }),
      aUser({ id: 'user-3', email: 'eva@example.com', twoStepOn: false }),
      aUser({ id: 'user-4', email: 'ines@example.com', twoStepOn: true }),
    ]);

    expect(textOf(fixture)).toContain('2 people must set up two-step sign-in');
  });

  it('doesn’t count invited, disabled or single sign-on users as missing two-step sign-in', async () => {
    const { fixture } = await render([
      aUser({ id: 'user-2', email: 'rui@example.com', status: 'invited', twoStepOn: false }),
      aUser({ id: 'user-3', email: 'eva@example.com', status: 'disabled', twoStepOn: false }),
      aUser({ id: 'user-4', email: 'ines@example.com', singleSignOn: true, twoStepOn: false }),
    ]);

    expect(textOf(fixture)).not.toContain('must set up two-step sign-in');
  });

  it('says a user never signed in', async () => {
    const { fixture } = await render([aUser({ email: 'rui@example.com' })]);

    expect(cellsOfRow(fixture, 'rui@example.com')[3]).toBe('Never');
  });

  it('says when a user last signed in', async () => {
    const { fixture } = await render([
      aUser({ email: 'rui@example.com', lastSignInAt: '2026-11-04T09:00:00Z' }),
    ]);

    expect(cellsOfRow(fixture, 'rui@example.com')[3]).toBe('3 hours ago');
  });

  it.each([
    [aUser({ status: 'active' }), 'Active'],
    [aUser({ status: 'disabled' }), 'Disabled'],
    [invited, 'Invited, link expires in 3 days'],
  ])('shows whether a user is active, disabled or invited', async (user, status) => {
    const { fixture } = await render([user]);

    expect(cellsOfRow(fixture, user.email)[4]).toBe(status);
  });

  it('explains what each role can do', async () => {
    const { fixture } = await render([]);

    expect(definitionOf(fixture, 'Operator')).toBe(
      'Routes, certificates, redirects and backups. Not users.',
    );
  });

  it('opens the invite dialog', async () => {
    const { fixture, dialog } = await render([]);

    byRole(fixture, 'button', 'Invite someone').click();
    await settle(fixture);

    expect(dialog.opened[0].component).toBe(InviteDialog);
  });

  it('shows the invite link once the invite is created', async () => {
    const dialog = new ClosingDialog({
      link: { userId: 'user-9', token: 'token-9', expiresAt: '2026-11-07T12:00:00Z' },
      email: 'eva@example.com',
      name: 'Eva Lima',
    });
    const { fixture } = await render([], dialog);

    byRole(fixture, 'button', 'Invite someone').click();
    await settle(fixture);

    expect(dialog.opened[1]).toEqual({
      component: InviteLinkDialog,
      data: {
        heading: 'Invite Eva Lima',
        email: 'eva@example.com',
        url: `${location.origin}/invite/token-9`,
        renewed: false,
      },
    });
  });

  it('offers an invited user a new link or revoking the invite', async () => {
    const users = await render([invited]);

    await openActions(users, 'Eva Lima');

    expect(menuItemNames()).toEqual(['Make a new invite link', 'Revoke invite…']);
  });

  it('makes a new invite link', async () => {
    const users = await render([invited]);
    await openActions(users, 'Eva Lima');

    await pick(users, 'Make a new invite link');
    const request = await nextRequest(users.backend, '/api/users/renew-invite');
    request.flush({ userId: 'user-3', token: 'token-10', expiresAt: '2026-11-07T12:00:00Z' });

    expect(request.request.body).toEqual({ id: 'user-3' });
    await vi.waitFor(() =>
      expect(users.dialog.opened[0].data).toEqual({
        heading: 'New invite link',
        email: 'eva@example.com',
        url: `${location.origin}/invite/token-10`,
        renewed: true,
      }),
    );
  });

  it('explains why a new invite link wasn’t made', async () => {
    const users = await render([invited]);
    await openActions(users, 'Eva Lima');

    await pick(users, 'Make a new invite link');
    (await nextRequest(users.backend, '/api/users/renew-invite')).flush(
      aProblem(403, 'auth.forbidden'),
      { status: 403, statusText: 'Forbidden' },
    );

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0]).toMatchObject({
        text: 'Your role doesn’t allow this. Ask an Administrator if you need it.',
        tone: 'error',
      }),
    );
  });

  it('revokes an invite once confirmed', async () => {
    const users = await render([invited]);
    await openActions(users, 'Eva Lima');

    await pick(users, 'Revoke invite…');
    const request = await nextRequest(users.backend, '/api/users/delete');
    request.flush(null);

    expect([users.confirmer.asked[0].heading, request.request.body]).toEqual([
      'Revoke the invite for eva@example.com?',
      { id: 'user-3' },
    ]);
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Invite revoked.'),
    );
  });

  it('opens the role dialog for a user', async () => {
    const users = await render([rui]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Change role…');

    expect(users.dialog.opened[0]).toEqual({ component: RoleDialog, data: rui });
  });

  it.each([
    ['administrator', 'Rui Costa is now an Administrator. It applies at their next request.'],
    ['viewer', 'Rui Costa is now a Viewer. It applies at their next request.'],
  ])('says the new role applies at the next request', async (role, text) => {
    const users = await render([rui], new ClosingDialog(role));
    await openActions(users, 'Rui Costa');

    await pick(users, 'Change role…');

    expect(TestBed.inject(Toaster).toasts()[0].text).toBe(text);
  });

  it('doesn’t change the role of a single sign-on user here', async () => {
    const users = await render([aUser({ name: 'Rui Costa', singleSignOn: true })]);

    await openActions(users, 'Rui Costa');

    expect(menuItem('Change role…').getAttribute('aria-disabled')).toBe('true');
  });

  it('resets a user’s two-step sign-in once confirmed', async () => {
    const users = await render([rui]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Reset two-step sign-in…');
    const request = await nextRequest(users.backend, '/api/users/reset-two-step');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'user-2' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Rui Costa sets up two-step sign-in at their next sign-in.',
      ),
    );
  });

  it('disables a user once confirmed', async () => {
    const users = await render([rui]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Disable…');
    const request = await nextRequest(users.backend, '/api/users/disable');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'user-2' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Rui Costa disabled.'),
    );
  });

  it('doesn’t let users disable or delete themselves', async () => {
    const users = await render([aUser({ id: 'user-1', name: 'Ana Silva' })]);

    await openActions(users, 'Ana Silva');

    expect(
      [menuItem('Disable…'), menuItem('Delete…')].map((item) => item.getAttribute('aria-disabled')),
    ).toEqual(['true', 'true']);
  });

  it('enables a disabled user', async () => {
    const users = await render([aUser({ ...rui, status: 'disabled' })]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Enable');
    const request = await nextRequest(users.backend, '/api/users/enable');
    request.flush(null);

    expect(request.request.body).toEqual({ id: 'user-2' });
    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Rui Costa can sign in again.'),
    );
  });

  it('explains why a user wasn’t enabled', async () => {
    const users = await render([aUser({ ...rui, status: 'disabled' })]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Enable');
    (await nextRequest(users.backend, '/api/users/enable')).error(new ProgressEvent('error'));

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe(
        'Apiary didn’t answer. Check your connection and try again.',
      ),
    );
  });

  it('asks to type the email before deleting a user', async () => {
    const users = await render([rui]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Delete…');

    expect(users.confirmer.asked[0]).toMatchObject({
      heading: 'Delete Rui Costa?',
      confirm: 'Delete user',
      typeToConfirm: 'rui@example.com',
    });
  });

  it('deletes a user once confirmed', async () => {
    const users = await render([rui]);
    await openActions(users, 'Rui Costa');

    await pick(users, 'Delete…');
    (await nextRequest(users.backend, '/api/users/delete')).flush(null);

    await vi.waitFor(() =>
      expect(TestBed.inject(Toaster).toasts()[0].text).toBe('Rui Costa deleted.'),
    );
  });
});
