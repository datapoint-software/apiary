import { Confirmer, I18n, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { RedirectView } from '../api/models';
import { redirectLabel, wholeHost } from './redirect-rules';

export interface RedirectDeleter {
  readonly api: Api;
  readonly confirmer: Confirmer;
  readonly toaster: Toaster;
  readonly i18n: I18n;
}

export async function deleteRedirect(redirect: RedirectView, { api, confirmer, toaster, i18n }: RedirectDeleter): Promise<boolean> {
  const label = redirectLabel(redirect);
  const text =
    redirect.path === wholeHost
      ? i18n.t('Requests to it get a 404 at once. Browsers may remember a permanent redirect for a while.')
      : i18n.t('Requests to this path go to the routes of {hostname} again, or get a 404 if there are none. Browsers may remember a permanent redirect for a while.', {
          hostname: redirect.from,
        });
  const deleted = await confirmer.confirm({
    heading: i18n.t('Delete the redirect from {hostname}?', { hostname: label }),
    text,
    confirm: i18n.t('Delete redirect'),
    busy: i18n.t('Deleting…'),
    action: () => api.send('redirects.delete', { id: redirect.id }),
  });
  if (deleted) {
    toaster.show(i18n.t('The redirect from {hostname} was deleted.', { hostname: label }));
  }
  return deleted;
}
