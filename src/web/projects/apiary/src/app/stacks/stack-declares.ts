import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@datapoint/apiary-ui';
import { DeclaredItemView, StackItemKind } from '../api/models';
import { kindLabels } from './stack-text';

const pages: Record<StackItemKind, string> = {
  route: '/routes',
  streamRoute: '/streams',
  redirect: '/redirects',
};

@Component({
  selector: 'ap-stack-declares',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="ap-panel" style="max-width: 800px" aria-labelledby="declares-title">
      <div class="ap-panel-head">
        <div>
          <h2 class="ap-h ap-h-3" id="declares-title">{{ 'What it declares' | t }}</h2>
          <p class="ap-panel-desc">
            {{
              'Fields the labels set are locked on their pages. Disabling and maintenance windows stay available.'
                | t
            }}
          </p>
        </div>
      </div>
      @if (items().length === 0) {
        <div class="ap-panel-body">
          <p class="ap-muted" style="margin: 0">
            {{ 'Nothing: the last apply removed everything it declared.' | t }}
          </p>
        </div>
      } @else {
        <div class="ap-table-wrap">
          <table class="ap-table">
            <caption class="ap-sr">
              {{
                'What {stack} declares' | t: { stack: stack() }
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ 'Name' | t }}</th>
                <th scope="col">{{ 'Kind' | t }}</th>
                <th scope="col">{{ 'Service' | t }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>
                    <a class="ap-data" [routerLink]="itemLink(item)">{{ item.name }}</a>
                  </td>
                  <td class="ap-muted">
                    {{ kindLabels[item.kind] | t }}
                    @if (item.listenPort) {
                      <span class="ap-tag"
                        >{{ item.protocol?.toUpperCase() }} {{ item.listenPort }}</span
                      >
                    }
                  </td>
                  <td class="ap-data ap-muted">{{ item.service }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackDeclares {
  readonly stack = input.required<string>();
  readonly items = input.required<readonly DeclaredItemView[]>();
  protected readonly kindLabels = kindLabels;

  protected itemLink(item: DeclaredItemView): string {
    return item.kind === 'route' ? `${pages.route}/${item.id}` : pages[item.kind];
  }
}
