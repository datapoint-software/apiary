import { Directive, computed, inject } from '@angular/core';
import { I18n } from '@datapoint/apiary-ui';
import { ClusterStatus, writesPaused } from './cluster-status';

@Directive({
  selector: '[apWrite]',
  host: {
    'data-write': '',
    '[attr.aria-disabled]': 'locked() ? "true" : null',
    '[attr.title]': 'locked() ? reason() : null',
  },
})
export class WriteLock {
  private readonly cluster = inject(ClusterStatus);
  protected readonly locked = computed(() => this.cluster.locked());
  private readonly i18n = inject(I18n);
  protected readonly reason = computed(() => this.i18n.t(writesPaused));
}
