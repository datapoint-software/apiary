import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@datapoint/apiary-ui';
import { ChallengeRecord } from './dns-names';

@Component({
  selector: 'ap-cname-table',
  imports: [TranslatePipe],
  templateUrl: './cname-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CnameTable {
  readonly records = input.required<readonly ChallengeRecord[]>();
}
