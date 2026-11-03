import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from '@datapoint/apiary-ui';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet, Toasts],
  template: '<router-outlet /><ap-toasts />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
