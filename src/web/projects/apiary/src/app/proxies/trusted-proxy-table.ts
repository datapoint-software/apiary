import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { TrustedProxyView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';

export interface ProxyRow {
  readonly proxy: TrustedProxyView;
  readonly lastRequest: string;
  readonly isQuiet: boolean;
}

@Component({
  selector: 'ap-trusted-proxy-table',
  imports: [WriteLock, Button, Status, TranslatePipe],
  templateUrl: './trusted-proxy-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedProxyTable {
  readonly rows = input.required<readonly ProxyRow[]>();
  readonly canChange = input(false);
  readonly edit = output<TrustedProxyView>();
  readonly remove = output<TrustedProxyView>();
}
