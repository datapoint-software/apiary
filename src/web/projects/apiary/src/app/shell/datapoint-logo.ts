import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ap-datapoint-logo',
  templateUrl: './datapoint-logo.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatapointLogo {}
