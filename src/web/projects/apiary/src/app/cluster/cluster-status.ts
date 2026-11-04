import { httpResource } from '@angular/common/http';
import { DOCUMENT, DestroyRef, Service, computed, inject, linkedSignal } from '@angular/core';
import { I18n, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ClusterView } from '../api/models';

export const writesPaused =
  "Changes are paused while the cluster can't reach a majority of replicas.";

@Service()
export class ClusterStatus {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  private readonly resource = httpResource<ClusterView>(() => this.api.query('cluster.status'));
  readonly view = linkedSignal<ClusterView | undefined, ClusterView | undefined>({
    source: () => (this.resource.hasValue() ? this.resource.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });
  readonly isLoading = this.resource.isLoading;
  readonly locked = computed(() => this.view()?.writable === false);
  readonly voters = computed(
    () => this.view()?.members.filter((m) => m.role !== 'joining') ?? [],
  );
  readonly reachable = computed(() => this.voters().filter((m) => m.reachable).length);

  constructor() {
    const timer = setInterval(() => this.reload(), 10_000);
    const document = inject(DOCUMENT);
    const onClick = (event: MouseEvent) => this.refuse(event);
    document.addEventListener('click', onClick, true);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('click', onClick, true);
    });
  }

  reload(): void {
    this.resource.reload();
  }

  private refuse(event: MouseEvent): void {
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-write][aria-disabled="true"]')
        : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.toaster.show(
      `${this.i18n.t(writesPaused)} ${this.i18n.t('Routing continues with the last configuration.')}`,
      {
        tone: 'info',
        heading: this.i18n.t('Changes are paused'),
      },
    );
  }
}
