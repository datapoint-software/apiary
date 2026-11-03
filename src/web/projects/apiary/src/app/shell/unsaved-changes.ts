import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Confirmer } from '@datapoint/apiary-ui';
import { HasUnsavedChanges } from './has-unsaved-changes';

export const unsavedChanges: CanDeactivateFn<HasUnsavedChanges> = (page) => {
  if (!page.hasUnsavedChanges()) {
    return true;
  }
  return inject(Confirmer).confirm({
    heading: 'Leave without saving?',
    text: 'Your changes on this page will be lost.',
    confirm: 'Leave page',
    action: async () => undefined,
  });
};
