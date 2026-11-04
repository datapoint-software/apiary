import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ApiProblem, Button, Confirmer, ErrorSummary, Field, Form, I18n, Status, Toaster, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { RouteDefaultsView, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { RequestSizeModel, formatSize, requestSize, sizeModel, toMegabytes } from './request-size';
import { routeLabel } from './route-label';

export interface OwnLimit {
  readonly id: string;
  readonly label: string;
  readonly size?: string;
  readonly isOpen: boolean;
}

@Component({
  selector: 'ap-route-defaults-panel',
  imports: [WriteLock, Form, Field, FormField, ErrorSummary, Button, Status, RouterLink, TranslatePipe],
  templateUrl: './route-defaults-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDefaultsPanel {
  readonly routes = input.required<readonly RouteView[]>();
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly confirmer = inject(Confirmer);
  private readonly i18n = inject(I18n);
  private readonly current = httpResource<RouteDefaultsView>(() => this.api.query('routes.defaults'));
  private readonly model = signal<RequestSizeModel>(sizeModel(30));
  protected readonly defaults = form(this.model, (size) => {
    requestSize(size.amount, size.unit);
  });

  protected readonly currentSize = computed(() => formatSize(this.current.hasValue() ? this.current.value().requestMegabytes : 30));
  private readonly using = computed(() => this.routes().filter((r) => r.requestSize === 'default').length);
  protected readonly usage = computed(() => {
    const total = this.routes().length;
    if (total === 0) {
      return '';
    }
    if (this.using() === total) {
      return this.i18n.t('Every route uses it.');
    }
    return this.i18n.plural(this.using(), '{count} of {total} routes uses it.', '{count} of {total} routes use it.', { total });
  });
  protected readonly ownLimits = computed<OwnLimit[]>(() =>
    this.routes()
      .filter((r) => r.requestSize !== 'default')
      .map((r) => ({
        id: r.id,
        label: routeLabel(r),
        size: r.requestSize === 'custom' ? formatSize(r.requestMegabytes ?? 0) : undefined,
        isOpen: r.requestSize === 'unlimited' && r.allowedAddresses.length === 0,
      })),
  );

  constructor() {
    effect(() => {
      const current = this.current.value();
      if (current && !this.defaults().dirty()) {
        this.model.set(sizeModel(current.requestMegabytes));
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        await this.change(toMegabytes(this.model()) ?? 0);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.defaults);
      }
    });
  }

  private async change(megabytes: number): Promise<void> {
    const previous = this.current.hasValue() ? this.current.value().requestMegabytes : 30;
    if (megabytes === previous) {
      this.toaster.show(this.i18n.t('The default is already {size}.', { size: formatSize(megabytes) }), { tone: 'info' });
      return;
    }
    const done = this.using() === 0 ? await this.send(megabytes).then(() => true) : await this.confirm(megabytes, previous);
    if (done) {
      this.saved(megabytes);
    }
  }

  private confirm(megabytes: number, previous: number): Promise<boolean> {
    return this.confirmer.confirm({
      heading: this.i18n.plural(this.using(), 'Change the limit on {count} route?', 'Change the limit on {count} routes?'),
      text: this.confirmation(megabytes, previous),
      confirm: this.i18n.t('Change the default'),
      busy: this.i18n.t('Saving…'),
      tone: megabytes < previous ? 'danger' : 'primary',
      action: () => this.send(megabytes),
    });
  }

  private confirmation(megabytes: number, previous: number): string {
    const params = { size: formatSize(megabytes), previous: formatSize(previous) };
    const change = this.i18n.plural(
      this.using(),
      'One route uses the cluster default. It will accept requests up to {size} instead of {previous}, on every replica as soon as you save.',
      '{count} routes use the cluster default. They will accept requests up to {size} instead of {previous}, on every replica as soon as you save.',
      params,
    );
    const failing = megabytes < previous ? ` ${this.i18n.t('Uploads larger than that start failing with a 413.')}` : '';
    return `${change}${failing} ${this.i18n.t('Routes with their own limit don’t change.')}`;
  }

  private send(megabytes: number): Promise<void> {
    return this.api.send('routes.update-defaults', { requestMegabytes: megabytes });
  }

  private saved(megabytes: number): void {
    this.defaults().reset();
    this.current.reload();
    const size = formatSize(megabytes);
    const text = this.using() === 0
      ? this.i18n.t('New routes accept requests up to {size}, on every replica.', { size })
      : this.i18n.plural(this.using(), '{count} route now accepts requests up to {size}, on every replica.', '{count} routes now accept requests up to {size}, on every replica.', { size });
    this.toaster.show(text, { heading: this.i18n.t('Default saved') });
  }
}
