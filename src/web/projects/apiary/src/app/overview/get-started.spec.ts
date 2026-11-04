import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserView } from '../api/models';
import { ProjectDialog } from '../projects/project-dialog';
import { answerAll } from '../testing/answer-all';
import { aCluster, aUser } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, queryByRole, settle, textOf } from '../testing/dom';
import { GetStarted } from './get-started';

interface Rendered {
  readonly fixture: ComponentFixture<GetStarted>;
  readonly dialog: ClosingDialog;
}

async function render(projectCount: number, users: UserView[] = [aUser()]): Promise<Rendered> {
  const dialog = new ClosingDialog();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Dialog, useValue: dialog },
    ],
  });
  const fixture = TestBed.createComponent(GetStarted);
  fixture.componentRef.setInput('projectCount', projectCount);
  await answerAll(fixture, TestBed.inject(HttpTestingController), {
    '/api/users/list': users,
    '/api/cluster/status': aCluster(),
  });
  return { fixture, dialog };
}

describe('GetStarted', () => {
  it('counts only the administrator as done at first', async () => {
    const { fixture } = await render(1);

    expect(textOf(fixture)).toContain('1 of 4 done');
  });

  it('counts a second project and a second person as done', async () => {
    const { fixture } = await render(2, [aUser({ id: 'user-1' }), aUser({ id: 'user-2' })]);

    expect([
      textOf(fixture).includes('3 of 4 done'),
      queryByRole(fixture, 'button', 'New project'),
      queryByRole(fixture, 'link', 'Invite people'),
    ]).toEqual([true, undefined, undefined]);
  });

  it('opens the new project dialog', async () => {
    const { fixture, dialog } = await render(1);

    byRole(fixture, 'button', 'New project').click();
    await settle(fixture);

    expect(dialog.opened[0].component).toBe(ProjectDialog);
  });

  it('reminds to take a backup', async () => {
    const { fixture } = await render(1);

    expect(byRole(fixture, 'link', 'Go to backups').getAttribute('href')).toBe('/backups');
  });
});
