import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState, PageHead, TranslatePipe } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { PipelineTokenView } from '../api/models';
import { TokenTable } from './token-table';

@Component({
  selector: 'ap-pipeline-token-list',
  imports: [PageHead, EmptyState, TokenTable, RouterLink, TranslatePipe],
  template: `
    <ap-page-head [heading]="'Pipeline tokens' | t">
      <span pageSub>{{
        'A CI pipeline uses a token to sign in to Apiary and apply a stack file, so the routes in its labels change in the same deploy as the services. You only need one if you deploy from CI.'
          | t
      }}</span>
    </ap-page-head>
    <section class="ap-panel" aria-labelledby="tokens-title">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="tokens-title">{{ 'Tokens' | t }}</h2>
          <p class="ap-panel-desc">
            {{
              'Each token can only change the stack it was created for: it can’t change other stacks, routes not from a stack, users or settings. To create one, open the stack on the'
                | t
            }}
            <a routerLink="/stacks">{{ 'Stacks' | t }}</a>
            {{
              'page. Revoking a token stops its pipeline at once, and the routes it applied stay as they are.'
                | t
            }}
          </p>
        </div>
      </div>
      @if (tokens.value().length === 0) {
        @if (!tokens.isLoading()) {
          <ap-empty-state [heading]="'No pipeline tokens' | t">
            {{
              'Nothing can apply a stack file yet, so routes change only here, in the API and through agents. To let a pipeline apply one, open its stack on the'
                | t
            }}
            <a routerLink="/stacks">{{ 'Stacks' | t }}</a>
            {{ 'page and create a token.' | t }}
          </ap-empty-state>
        }
      } @else {
        <ap-token-table [tokens]="tokens.value()" [showStack]="true" />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTokenList {
  private readonly api = inject(Api);
  protected readonly tokens = httpResource<PipelineTokenView[]>(
    () => this.api.query('pipeline-tokens.list'),
    { defaultValue: [] },
  );
}
