import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from '@datapoint/apiary-ui';
import { DisplaySettings } from './shell/display-settings';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet, Toasts],
  template: '<router-outlet /><ap-toasts />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly display = inject(DisplaySettings);
}
