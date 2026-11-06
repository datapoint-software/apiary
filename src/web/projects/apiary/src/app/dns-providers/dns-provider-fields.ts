import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Field, I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { DnsProviderKind } from '../api/models';
import { DnsProviderModel } from './dns-provider-rules';

@Component({
  selector: 'ap-dns-provider-fields',
  imports: [Field, FormField, TranslatePipe],
  templateUrl: './dns-provider-fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnsProviderFields {
  readonly provider = input.required<FieldTree<DnsProviderModel>>();
  readonly kind = input.required<DnsProviderKind>();
  readonly secretKept = input(false);
  private readonly i18n = inject(I18n);
  protected readonly guid = '00000000-0000-0000-0000-000000000000';
  private readonly kept = computed(() => (this.secretKept() ? this.i18n.t('Saved. Enter a new value to replace it.') : ''));
  protected readonly secretPlaceholder = computed(() => this.kept() || this.i18n.t('Base64, as tsig-keygen prints it'));
  protected readonly placeholder = computed(() => this.kept());
}
