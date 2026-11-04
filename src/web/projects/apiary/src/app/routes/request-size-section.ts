import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Banner, Field, I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { formatSize } from './request-size';
import { RouteModel } from './route-model';

@Component({
  selector: 'ap-request-size-section',
  imports: [Banner, Field, FormField, TranslatePipe],
  templateUrl: './request-size-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestSizeSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  readonly defaultMegabytes = input.required<number>();
  private readonly i18n = inject(I18n);
  protected readonly defaultLabel = computed(() => this.i18n.t('Cluster default, {size}', { size: formatSize(this.defaultMegabytes()) }));
  protected readonly isCustom = computed(() => this.route().requestSize().value() === 'custom');
  protected readonly isOpenWithoutLimit = computed(() => {
    const route = this.route();
    return route.requestSize().value() === 'unlimited' && !route.allowedAddresses().value().trim();
  });
}
