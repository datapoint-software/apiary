import { Directive, computed, inject } from '@angular/core';
import { ClusterStatus, writesPaused } from './cluster-status';

@Directive({
  selector: '[apWrite]',
  host: {
    'data-write': '',
    '[attr.aria-disabled]': 'locked() ? "true" : null',
    '[attr.title]': 'locked() ? reason : null',
  },
})
export class WriteLock {
  private readonly cluster = inject(ClusterStatus);
  protected readonly locked = computed(() => this.cluster.locked());
  protected readonly reason = writesPaused;
}
