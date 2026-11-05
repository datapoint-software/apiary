import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, TranslatePipe } from '@datapoint/apiary-ui';
import { PipelineTokenView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { StackActions } from './stack-actions';

@Component({
  selector: 'ap-token-table',
  imports: [WriteLock, Button, RouterLink, TranslatePipe],
  template: `
    <div class="ap-table-wrap">
      <table class="ap-table">
        <caption class="ap-sr">
          {{
            'Pipeline tokens' | t
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ 'Token' | t }}</th>
            @if (showStack()) {
              <th scope="col">{{ 'Stack' | t }}</th>
            }
            <th scope="col">{{ 'Created' | t }}</th>
            <th scope="col">{{ 'Last used' | t }}</th>
            <th scope="col">{{ 'Expires' | t }}</th>
            <th scope="col" class="ap-col-actions">
              <span class="ap-sr">{{ 'Actions' | t }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (token of tokens(); track token.id) {
            <tr>
              <td class="ap-data">{{ token.name }}</td>
              @if (showStack()) {
                <td>
                  <a class="ap-tag" [routerLink]="['/stacks', token.stack]">{{ token.stack }}</a>
                </td>
              }
              <td class="ap-muted">{{ created(token) }}</td>
              <td class="ap-muted">
                {{ token.lastUsedAt ? ago(token.lastUsedAt) : ('Never' | t) }}
              </td>
              <td class="ap-data">{{ token.expiresAt.slice(0, 10) }}</td>
              <td class="ap-col-actions">
                @if (auth.canAdminister()) {
                  <button
                    apWrite
                    apButton
                    size="small"
                    type="button"
                    [attr.aria-label]="'Revoke {name}' | t: { name: token.name }"
                    (click)="actions.revoke(token)"
                  >
                    {{ 'Revoke…' | t }}
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenTable {
  readonly tokens = input.required<readonly PipelineTokenView[]>();
  readonly showStack = input(false);
  protected readonly auth = inject(Auth);
  protected readonly actions = inject(StackActions);
  protected readonly ago = timeAgo;

  protected created(token: PipelineTokenView): string {
    return token.createdBy
      ? `${timeAgo(token.createdAt)} · ${token.createdBy}`
      : timeAgo(token.createdAt);
  }
}
