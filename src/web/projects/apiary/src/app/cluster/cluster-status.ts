import { httpResource } from '@angular/common/http';
import { DOCUMENT, DestroyRef, Service, computed, inject } from '@angular/core';
import { Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ClusterView } from '../api/models';

export const writesPaused = "Changes are paused while the cluster can't reach a majority of replicas.";

@Service()
export class ClusterStatus {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  readonly view = httpResource<ClusterView>(() => this.api.query('cluster.status'));
  readonly locked = computed(() => this.view.value()?.writable === false);
  readonly voters = computed(() => this.view.value()?.members.filter((m) => m.role !== 'joining') ?? []);
  readonly reachable = computed(() => this.voters().filter((m) => m.reachable).length);

  constructor() {
    const timer = setInterval(() => this.view.reload(), 10_000);
    const document = inject(DOCUMENT);
    const onClick = (event: MouseEvent) => this.refuse(event);
    document.addEventListener('click', onClick, true);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('click', onClick, true);
    });
  }

  private refuse(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target.closest('[data-write][aria-disabled="true"]') : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.toaster.show(`${writesPaused} Routing continues with the last configuration.`, { tone: 'info', heading: 'Changes are paused' });
  }
}
