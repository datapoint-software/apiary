import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Banner,
  Button,
  ErrorMessages,
  I18n,
  PageHead,
  Status,
  TranslatePipe,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { StackDetailsView } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { CopyText } from '../auth/copy-text';
import { WriteLock } from '../cluster/write-lock';
import { PlanList } from './plan-list';
import { StackActions } from './stack-actions';
import { StackDeclares } from './stack-declares';
import { failureParams } from './stack-text';
import { StackTokens } from './stack-tokens';

const sampleLabels = `services:
  web:
    image: registry.example.com/shop/web:2.14.0
    deploy:
      labels:
        apiary.project: Shop
        apiary.route.web.host: shop.example.com
        apiary.route.web.port: "8080"
        apiary.redirect.www.from: www.shop.example.com
        apiary.redirect.www.to: https://shop.example.com`;

@Component({
  selector: 'ap-stack-page',
  imports: [
    WriteLock,
    PageHead,
    Banner,
    Button,
    Status,
    PlanList,
    StackDeclares,
    StackTokens,
    CopyText,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './stack-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackPage {
  readonly name = input.required<string>();
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  private readonly messages = inject(ErrorMessages);
  protected readonly actions = inject(StackActions);
  protected readonly auth = inject(Auth);
  protected readonly sampleLabels = sampleLabels;
  protected readonly ago = timeAgo;
  protected readonly notFound = this.messages.describe('stack.notFound');
  protected readonly details = httpResource<StackDetailsView>(() =>
    this.api.query('stacks.get', { name: this.name() }),
  );
  protected readonly current = computed(() =>
    this.details.hasValue() ? this.details.value() : undefined,
  );
  protected readonly crumbs = computed(() => [{ label: this.i18n.t('Stacks'), link: '/stacks' }]);
  protected readonly failure = computed(() => {
    const failure = this.current()?.stack.failure;
    return failure
      ? this.messages.describe(failure.code, failureParams(failure.code, failure.detail))
      : '';
  });
  protected readonly server = computed(() => location.origin);
  protected readonly dryRun = computed(
    () => `docker run --rm -e APIARY_TOKEN -v "$PWD:/work" datapointsoftware/apiary \\
  apply --dry-run --server ${this.server()} --stack ${this.name()} /work/stack.yaml`,
  );
  protected readonly apply = computed(
    () => `docker stack deploy --compose-file stack.yaml ${this.name()}
docker run --rm -e APIARY_TOKEN -v "$PWD:/work" datapointsoftware/apiary \\
  apply --server ${this.server()} --stack ${this.name()} /work/stack.yaml`,
  );

  protected async remove(): Promise<void> {
    const details = this.current();
    if (details && (await this.actions.remove(details.stack, details.tokens.length))) {
      await this.router.navigate(['/stacks']);
    }
  }
}
