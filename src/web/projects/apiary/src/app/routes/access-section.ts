import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Field } from '@datapoint/apiary-ui';
import { RouteModel } from './route-model';

@Component({
  selector: 'ap-access-section',
  imports: [Field, FormField],
  templateUrl: './access-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  readonly rateLimited = input(false);
}
