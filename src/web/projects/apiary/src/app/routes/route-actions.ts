import { Service, inject } from '@angular/core';
import { ApiProblem, Confirmer, ErrorMessages, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { RouteView } from '../api/models';
import { routeLabel } from './route-label';

@Service()
export class RouteActions {
  private readonly api = inject(Api);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);

  async disable(route: RouteView): Promise<boolean> {
    const label = routeLabel(route);
    const disabled = await this.confirmer.confirm({
      heading: `Disable ${label}?`,
      text: 'Visitors get a 503 until you enable it again. Its settings and certificate are kept.',
      confirm: 'Disable route',
      busy: 'Disabling…',
      action: () => this.api.send('routes.disable', { id: route.id }),
    });
    if (disabled) {
      this.toaster.show(`${label} disabled.`, { action: { label: 'Undo', run: () => void this.enable(route) } });
    }
    return disabled;
  }

  async delete(route: RouteView): Promise<boolean> {
    const label = routeLabel(route);
    const deleted = await this.confirmer.confirm({
      heading: `Delete route ${label}?`,
      text: 'Requests to this hostname and path get a 404 on every replica as soon as you confirm.',
      confirm: 'Delete route',
      busy: 'Deleting…',
      typeToConfirm: route.host,
      action: () => this.api.send('routes.delete', { id: route.id }),
    });
    if (deleted) {
      this.toaster.show(`${label} deleted.`);
    }
    return deleted;
  }

  async deleteMany(routes: readonly RouteView[]): Promise<boolean> {
    if (routes.length === 1) {
      return this.delete(routes[0]);
    }
    const deleted = await this.confirmer.confirm({
      heading: `Delete ${routes.length} routes?`,
      text: `Requests to these hostnames get a 404 on every replica as soon as you confirm: ${routes.map(routeLabel).join(', ')}.`,
      confirm: `Delete ${routes.length} routes`,
      busy: 'Deleting…',
      typeToConfirm: `delete ${routes.length} routes`,
      action: async () => {
        for (const route of routes) {
          await this.api.send('routes.delete', { id: route.id });
        }
      },
    });
    if (deleted) {
      this.toaster.show(`${routes.length} routes deleted.`);
    }
    return deleted;
  }

  async purge(routes: readonly RouteView[]): Promise<boolean> {
    const cached = routes.filter((r) => r.caching);
    if (cached.length === 0) {
      this.toaster.show(routes.length === 1 ? 'Caching is off for this route, so there’s nothing to purge.' : 'None of these routes has caching on.', { tone: 'error' });
      return false;
    }
    try {
      await this.api.send('routes.purge-cache', { ids: cached.map((r) => r.id) });
      this.toaster.show(cached.length === 1 ? `Cache of ${routeLabel(cached[0])} purged on every replica.` : `Cache of ${cached.length} routes purged on every replica.`);
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
      this.toaster.show(`${label} enabled. Traffic flows again.`);
      return true;
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as ApiProblem).code), { tone: 'error' });
      return false;
    }
  }
}
