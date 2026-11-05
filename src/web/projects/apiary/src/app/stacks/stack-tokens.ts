import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Button, EmptyState, Icon, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { PipelineTokenView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { StackActions } from './stack-actions';
import { TokenTable } from './token-table';

@Component({
  selector: 'ap-stack-tokens',
  imports: [WriteLock, Button, EmptyState, Icon, TokenTable, TranslatePipe],
  template: `
    <section class="ap-panel" style="max-width: 800px" aria-labelledby="tokens-title">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="tokens-title">{{ 'Pipeline tokens' | t }}</h2>
          <p class="ap-panel-desc">
            {{ 'A pipeline needs one to apply {stack}.' | t: { stack: stack() } }}
            @if (!auth.canAdminister()) {
              {{ 'Only Administrators can create or revoke them.' | t }}
            }
          </p>
        </div>
        @if (auth.canAdminister()) {
          <button apWrite apButton type="button" (click)="actions.createToken(stack())">
            <ap-icon [icon]="addIcon" />{{ 'Create token' | t }}
          </button>
        }
      </div>
      @if (tokens().length === 0) {
        <ap-empty-state [heading]="'No tokens' | t">{{
          'Nothing can apply {stack} until an Administrator creates a token.'
            | t: { stack: stack() }
        }}</ap-empty-state>
      } @else {
        <ap-token-table [tokens]="tokens()" />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackTokens {
  readonly stack = input.required<string>();
  readonly tokens = input.required<readonly PipelineTokenView[]>();
  protected readonly auth = inject(Auth);
  protected readonly actions = inject(StackActions);
  protected readonly addIcon = Plus;
}
