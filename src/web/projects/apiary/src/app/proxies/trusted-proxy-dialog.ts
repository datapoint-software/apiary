import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ApiProblem, Banner, Button, ErrorSummary, Field, Form, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { TrustedProxyView } from '../api/models';
import { isPublicRange, parseRange } from './ip-address';
import { ProxyModel, maximumProxies, proxyRules } from './proxy-rules';

export interface ProxyDialogData {
  readonly proxy: TrustedProxyView | null;
  readonly proxies: readonly TrustedProxyView[];
}

export interface SavedProxy {
  readonly range: string;
  readonly added: boolean;
}

@Component({
  selector: 'ap-trusted-proxy-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Banner, Button, TranslatePipe],
  templateUrl: './trusted-proxy-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedProxyDialog {
  protected readonly dialog = inject<DialogRef<SavedProxy>>(DialogRef);
  private readonly data = inject<ProxyDialogData>(DIALOG_DATA);
  private readonly api = inject(Api);
  protected readonly existing = this.data.proxy;
  private readonly others = this.data.proxies.filter((p) => p.id !== this.existing?.id).map((p) => p.range);
  private readonly isFull = !this.existing && this.data.proxies.length >= maximumProxies;
  private readonly model = signal<ProxyModel>({ range: this.existing?.range ?? '', note: this.existing?.note ?? '' });
  protected readonly proxy = form(
    this.model,
    proxyRules(
      () => this.others,
      () => this.isFull,
    ),
  );
  protected readonly publicRange = computed(() => {
    const range = parseRange(this.model().range);
    const isValid = this.proxy.range().errors().length === 0;
    return range !== null && isValid && isPublicRange(range) ? this.model().range.trim() : '';
  });

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const saved = await apForm.submit(async () => {
      try {
        await this.persist(value);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.proxy);
      }
    });
    if (saved) {
      this.dialog.close({ range: value.range.trim(), added: !this.existing });
    }
  }

  private async persist(value: ProxyModel): Promise<void> {
    const body = { range: value.range.trim(), note: value.note.trim() || null };
    await (this.existing
      ? this.api.send('trusted-proxies.update', { id: this.existing.id, ...body })
      : this.api.send<string>('trusted-proxies.add', body));
  }
}
