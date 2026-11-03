import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Role } from '../api/models';
import { roleDescriptions, roleNames } from '../auth/roles';

@Component({
  selector: 'ap-role-choices',
  imports: [FormField],
  template: `
    <fieldset class="ap-field" style="border: 0; margin: 0; padding: 0">
      <legend class="ap-label" style="margin-bottom: 8px">Role</legend>
      <div class="ap-stack" style="gap: 10px">
        @for (role of roles; track role) {
          <label class="ap-choice">
            <input class="ap-radio" type="radio" [value]="role" [formField]="field()" />
            <span class="ap-choice-text">
              <span>{{ roleNames[role] }}</span>
              <span class="ap-help">{{ roleDescriptions[role] }}</span>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleChoices {
  readonly field = input.required<FieldTree<Role>>();
  protected readonly roles: readonly Role[] = ['administrator', 'operator', 'viewer'];
  protected readonly roleNames = roleNames;
  protected readonly roleDescriptions = roleDescriptions;
}
