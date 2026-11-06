import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button, Icon, Status, Tone, TranslatePipe } from '@datapoint/apiary-ui';
import { Pencil, Trash2 } from 'lucide';
import { DnsProviderView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';

export interface DnsProviderRow {
  readonly provider: DnsProviderView;
  readonly kind: string;
  readonly changed: string;
  readonly testTone: Tone;
  readonly testText: string;
  readonly testCaption: string;
}

@Component({
  selector: 'ap-dns-provider-table',
  imports: [WriteLock, Button, Icon, Status, TranslatePipe],
  templateUrl: './dns-provider-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnsProviderTable {
  readonly rows = input.required<readonly DnsProviderRow[]>();
  readonly canChange = input(false);
  readonly testing = input<string | null>(null);
  readonly test = output<DnsProviderView>();
  readonly edit = output<DnsProviderView>();
  readonly remove = output<DnsProviderView>();
  protected readonly icons = { edit: Pencil, delete: Trash2 };
}
