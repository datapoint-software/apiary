import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserView } from '../api/models';
import { Auth } from '../auth/auth';
import { aCluster, aSignedInUser, aUser } from '../testing/builders';
import { cellsOfRow, settle, textOf } from '../testing/dom';
import { UserList } from './user-list';

const me = aSignedInUser({ id: 'user-1', name: 'Ana Silva', email: 'ana@example.com' });

async function render(users: UserView[]) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  TestBed.inject(Auth).user.set(me);
  const fixture = TestBed.createComponent(UserList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/users/list').flush(users);
  backend.expectOne('/api/users/session-policy').flush({ idleMinutes: 30 });
  backend.match('/api/cluster/status').forEach((request) => request.flush(aCluster()));
  await settle(fixture);
  return fixture;
}

function tagsOf(fixture: ComponentFixture<UserList>, email: string): string[] {
  const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')];
  const row = rows.find((r) => r.textContent?.includes(email));
  return [...(row?.querySelectorAll('.ap-tag') ?? [])].map((tag) => tag.textContent?.trim() ?? '');
}

describe('UserList', () => {
  it('shows each user’s initials, name, email and role', async () => {
    const fixture = await render([
      aUser({ name: 'Rui Pedro Costa', email: 'rui@example.com', role: 'operator' }),
    ]);

    expect(cellsOfRow(fixture, 'rui@example.com').slice(0, 2)).toEqual([
      'RP Rui Pedro Costa rui@example.com',
      'Operator',
    ]);
  });

  it('tags the signed-in user’s own row as theirs', async () => {
    const fixture = await render([
      aUser({ id: 'user-1', name: 'Ana Silva', email: 'ana@example.com' }),
    ]);

    expect(tagsOf(fixture, 'ana@example.com')).toEqual(['You']);
  });

  it('tags users who sign in with single sign-on', async () => {
    const fixture = await render([aUser({ email: 'rui@example.com', singleSignOn: true })]);

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
    const fixture = await render([user]);

    expect(cellsOfRow(fixture, user.email)[2]).toBe(expected);
  });

  it('counts the active users who must set up two-step sign-in', async () => {
    const fixture = await render([
      aUser({ id: 'user-2', email: 'rui@example.com', twoStepOn: false }),
      aUser({ id: 'user-3', email: 'eva@example.com', twoStepOn: false }),
      aUser({ id: 'user-4', email: 'ines@example.com', twoStepOn: true }),
    ]);

    expect(textOf(fixture)).toContain('2 people must set up two-step sign-in');
  });

  it('doesn’t count invited, disabled or single sign-on users as missing two-step sign-in', async () => {
    const fixture = await render([
      aUser({ id: 'user-2', email: 'rui@example.com', status: 'invited', twoStepOn: false }),
      aUser({ id: 'user-3', email: 'eva@example.com', status: 'disabled', twoStepOn: false }),
      aUser({ id: 'user-4', email: 'ines@example.com', singleSignOn: true, twoStepOn: false }),
    ]);

    expect(textOf(fixture)).not.toContain('must set up two-step sign-in');
  });

  it('says a user never signed in', async () => {
    const fixture = await render([aUser({ email: 'rui@example.com' })]);

    expect(cellsOfRow(fixture, 'rui@example.com')[3]).toBe('Never');
  });
});
