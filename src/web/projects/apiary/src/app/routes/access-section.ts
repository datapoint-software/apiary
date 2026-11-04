import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Button, Field } from '@datapoint/apiary-ui';
import { RoutePasswordView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { passphrase } from './passphrase';
import { RouteModel } from './route-model';

@Component({
  selector: 'ap-access-section',
  imports: [Button, Field, FormField],
  templateUrl: './access-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  readonly current = input<RoutePasswordView>();
  readonly canWrite = input(true);
  protected readonly timeAgo = timeAgo;

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
