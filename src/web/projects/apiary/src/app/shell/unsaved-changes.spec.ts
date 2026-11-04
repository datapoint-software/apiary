import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Confirmer } from '@datapoint/apiary-ui';
import { AcceptingConfirmer } from '../testing/accepting-confirmer';
import { HasUnsavedChanges } from './has-unsaved-changes';
import { unsavedChanges } from './unsaved-changes';

function leave(page: HasUnsavedChanges) {
  const confirmer = new AcceptingConfirmer();
  TestBed.configureTestingModule({ providers: [{ provide: Confirmer, useValue: confirmer }] });
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() => unsavedChanges(page, route, state, state));
  return { result, confirmer };
}

describe('unsavedChanges', () => {
  it('lets the user leave a page without changes', () => {
    const { result, confirmer } = leave({ hasUnsavedChanges: () => false });

    expect(result).toBe(true);
    expect(confirmer.asked).toEqual([]);
  });

  it('asks before leaving a page with changes', async () => {
    const { result, confirmer } = leave({ hasUnsavedChanges: () => true });

    await expect(result).resolves.toBe(true);
    expect(confirmer.asked[0]).toMatchObject({
      heading: 'Leave without saving?',
      confirm: 'Leave page',
    });
  });
});
