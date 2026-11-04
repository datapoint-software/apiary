import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { CalendarButton, Field, TranslatePipe, hourMs } from '@datapoint/apiary-ui';
import { MaintenanceModel } from './route-model';

@Component({
  selector: 'ap-maintenance-section',
  imports: [Field, FormField, CalendarButton, TranslatePipe],
  templateUrl: './maintenance-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceSection {
  readonly maintenance = input.required<FieldTree<MaintenanceModel>>();
  readonly scheduled = input(false);
  protected readonly earliest = Math.floor(Date.now() / hourMs) * hourMs;
}
