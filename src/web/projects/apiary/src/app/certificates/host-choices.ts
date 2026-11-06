import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { CoveredHost } from './covered-hosts';

@Component({
  selector: 'ap-host-choices',
  imports: [FormField, TranslatePipe],
  templateUrl: './host-choices.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostChoices {
  readonly hosts = input.required<readonly CoveredHost[]>();
  readonly chosen = input.required<FieldTree<boolean[]>>();
  readonly intro = input('');
  private readonly i18n = inject(I18n);

  protected usage(host: CoveredHost): string {
    return host.currentName
      ? this.i18n.plural(host.routeCount, '{count} route, now on', '{count} routes, now on')
      : this.i18n.plural(host.routeCount, '{count} route, now on its own automatic certificate', '{count} routes, now on its own automatic certificate');
  }
}
