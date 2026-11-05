import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Button, Field, FieldHelp, I18n, TranslatePipe } from '@datapoint/apiary-ui';
import { RoutePasswordView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { passphrase } from './passphrase';
import { RouteModel } from './route-model';
import { StackTag } from '../stacks/stack-tag';

@Component({
  selector: 'ap-access-section',
  imports: [Button, Field, FieldHelp, FormField, RouterLink, StackTag, TranslatePipe],
  templateUrl: './access-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  readonly current = input<RoutePasswordView>();
  readonly canWrite = input(true);
  readonly rateLimitStack = input<string>();
  readonly behindTrustedProxies = input(false);
  protected readonly timeAgo = timeAgo;
  private readonly i18n = inject(I18n);
  protected readonly passwordNote = computed(() => {
    const setBy = this.current()?.setBy;
    return setBy
      ? this.i18n.t('By {name}. Apiary keeps only a hash, so it can’t show it again.', { name: setBy })
      : this.i18n.t('Apiary keeps only a hash, so it can’t show it again.');
  });

  protected setNewPassword(): void {
    const password = this.route().password;
    password.replace().value.set(true);
    this.generate();
  }

  protected generate(): void {
    const field = this.route().password.newPassword;
    field().value.set(passphrase());
    field().markAsDirty();
  }

  protected makeNewLink(): void {
    const newLink = this.route().password.newLink;
    newLink().value.set(true);
    newLink().markAsDirty();
  }
}
