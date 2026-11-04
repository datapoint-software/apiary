import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Confirmer, I18n } from '@datapoint/apiary-ui';
import { HasUnsavedChanges } from './has-unsaved-changes';

export const unsavedChanges: CanDeactivateFn<HasUnsavedChanges> = (page) => {
  if (!page.hasUnsavedChanges()) {
    return true;
  }
  const i18n = inject(I18n);
  return inject(Confirmer).confirm({
    heading: i18n.t('Leave without saving?'),
    text: i18n.t('Your changes on this page will be lost.'),
    confirm: i18n.t('Leave page'),
    action: async () => undefined,
  });
};
