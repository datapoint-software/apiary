import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NewPipelineToken, Role, StackView } from '../api/models';
import { Auth } from '../auth/auth';
import { answerClusterStatus } from '../testing/backend';
import { aProject, aSignedInUser, aStack } from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, cellsOfRow, queryByRole, settle, textOf } from '../testing/dom';
import { AddStackDialog } from './add-stack-dialog';
import { StackList } from './stack-list';
import { TokenValueDialog } from './token-value-dialog';

const created: NewPipelineToken = {
  id: 'token-1',
  name: 'shop-deploy',
  stack: 'shop',
  token: 'apiary_pt_secret',
  expiresAt: '2027-02-02T10:00:00Z',
};

async function render(
  stacks: StackView[],
  role: Role = 'administrator',
  dialog = new ClosingDialog(),
): Promise<ComponentFixture<StackList>> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Dialog, useValue: dialog },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(StackList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/stacks/list').flush(stacks);
  backend.expectOne('/api/projects/list').flush([aProject({ id: 'project-1', name: 'Shop' })]);
  await answerClusterStatus(backend);
  await settle(fixture);
  return fixture;
}

describe('StackList', () => {
  it('shows what each stack declares and its last apply', async () => {
    const fixture = await render([
      aStack({
        projectId: 'project-1',
        routes: 2,
        redirects: 1,
        lastApply: {
          at: new Date().toISOString(),
          token: 'shop-deploy',
          plan: { added: [{ kind: 'route', name: 'shop.example.com' }], changed: [], removed: [] },
        },
      }),
    ]);

    expect(cellsOfRow(fixture, 'shop')).toEqual([
      'shop',
      'Shop',
      '2 routes · 1 redirect',
      'Applied now by shop-deploy',
      '1 change',
    ]);
  });

  it('says when a stack is waiting for its first apply', async () => {
    const fixture = await render([aStack()]);

    expect(cellsOfRow(fixture, 'shop')).toEqual([
      'shop',
      'From labels',
      '–',
      'Waiting for the first apply',
      '–',
    ]);
  });

  it('flags a stack whose last apply failed', async () => {
    const fixture = await render([
      aStack({
        failure: { at: '2026-11-04T09:00:00Z', code: 'route.hostInUse', token: 'shop-deploy' },
      }),
    ]);

    expect(cellsOfRow(fixture, 'shop')[3]).toBe('Last apply failed');
  });

  it('invites an administrator to add the first stack', async () => {
    const fixture = await render([]);

    expect(textOf(fixture)).toContain('No stacks yet');
    expect(queryByRole(fixture, 'button', 'Add stack')).toBeDefined();
  });

  it('tells others that only administrators add stacks', async () => {
    const fixture = await render([], 'operator');

    expect(textOf(fixture)).toContain('Only Administrators can add stacks.');
    expect(queryByRole(fixture, 'button', 'Add stack')).toBeUndefined();
  });

  it('shows the new token once, then opens the stack', async () => {
    const dialog = new ClosingDialog(created);
    const fixture = await render([aStack({ name: 'blog' })], 'administrator', dialog);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    byRole(fixture, 'button', 'Add stack').click();
    await settle(fixture);

    expect(dialog.opened.map((d) => d.component)).toEqual([AddStackDialog, TokenValueDialog]);
    expect(dialog.opened[1].data).toBe(created);
    expect(navigate).toHaveBeenCalledWith(['/stacks', 'shop']);
  });
});
