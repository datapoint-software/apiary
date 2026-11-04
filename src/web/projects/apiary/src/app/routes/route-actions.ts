import { Service, inject } from '@angular/core';
import { ApiProblem, Confirmer, ErrorMessages, I18n, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { RouteView } from '../api/models';
import { routeLabel } from './route-label';

@Service()
export class RouteActions {
  private readonly api = inject(Api);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);

  async disable(route: RouteView): Promise<boolean> {
    const label = routeLabel(route);
    const disabled = await this.confirmer.confirm({
      heading: this.i18n.t('Disable {route}?', { route: label }),
      text: this.i18n.t('Visitors get a 503 until you enable it again. Its settings and certificate are kept.'),
      confirm: this.i18n.t('Disable route'),
      busy: this.i18n.t('Disabling…'),
      action: () => this.api.send('routes.disable', { id: route.id }),
    });
    if (disabled) {
      this.toaster.show(this.i18n.t('{route} disabled.', { route: label }), { action: { label: this.i18n.t('Undo'), run: () => void this.enable(route) } });
    }
    return disabled;
  }

  async delete(route: RouteView): Promise<boolean> {
    const label = routeLabel(route);
    const deleted = await this.confirmer.confirm({
      heading: this.i18n.t('Delete route {route}?', { route: label }),
      text: this.i18n.t('Requests to this hostname and path get a 404 on every replica as soon as you confirm.'),
      confirm: this.i18n.t('Delete route'),
      busy: this.i18n.t('Deleting…'),
      typeToConfirm: route.host,
      action: () => this.api.send('routes.delete', { id: route.id }),
    });
    if (deleted) {
      this.toaster.show(this.i18n.t('{route} deleted.', { route: label }));
    }
    return deleted;
  }

  async deleteMany(routes: readonly RouteView[]): Promise<boolean> {
    if (routes.length === 1) {
      return this.delete(routes[0]);
    }
    const count = routes.length;
    const deleted = await this.confirmer.confirm({
      heading: this.i18n.t('Delete {count} routes?', { count }),
      text: this.i18n.t('Requests to these hostnames get a 404 on every replica as soon as you confirm: {routes}.', { routes: routes.map(routeLabel).join(', ') }),
      confirm: this.i18n.t('Delete {count} routes', { count }),
      busy: this.i18n.t('Deleting…'),
      typeToConfirm: this.i18n.t('delete {count} routes', { count }),
      action: async () => {
        for (const route of routes) {
          await this.api.send('routes.delete', { id: route.id });
        }
      },
    });
    if (deleted) {
      this.toaster.show(this.i18n.t('{count} routes deleted.', { count }));
    }
    return deleted;
  }

  async purge(routes: readonly RouteView[]): Promise<boolean> {
    const cached = routes.filter((r) => r.caching);
    if (cached.length === 0) {
      const reason = routes.length === 1 ? 'Caching is off for this route, so there’s nothing to purge.' : 'None of these routes has caching on.';
      this.toaster.show(this.i18n.t(reason), { tone: 'error' });
      return false;
    }
    try {
      await this.api.send('routes.purge-cache', { ids: cached.map((r) => r.id) });
      this.toaster.show(this.purged(cached));
      return true;
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as ApiProblem).code), { tone: 'error' });
      return false;
    }
  }

  async enable(route: RouteView): Promise<boolean> {
    const label = routeLabel(route);
    try {
      await this.api.send('routes.enable', { id: route.id });
      this.toaster.show(this.i18n.t('{route} enabled. Traffic flows again.', { route: label }));
      return true;
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as ApiProblem).code), { tone: 'error' });
      return false;
    }
  }

  private purged(cached: readonly RouteView[]): string {
    if (cached.length === 1) {
      return this.i18n.t('Cache of {route} purged on every replica.', { route: routeLabel(cached[0]) });
    }
    return this.i18n.t('Cache of {count} routes purged on every replica.', { count: cached.length });
  }
}
