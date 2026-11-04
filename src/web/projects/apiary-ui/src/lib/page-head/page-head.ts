import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Crumb } from './crumb';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'ap-page-head',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './page-head.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHead {
  readonly heading = input.required<string>();
  readonly crumbs = input<readonly Crumb[]>([]);
}
