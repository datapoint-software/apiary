import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Status, Tone, TranslatePipe } from '@datapoint/apiary-ui';
import { StackPlan, StackPlanItem } from '../api/models';
import { timeAgo } from '../api/time-ago';
import { fieldLabels, kindLabels } from './stack-text';

interface PlanRow {
  readonly item: StackPlanItem;
  readonly tone: Tone;
  readonly label: string;
}

@Component({
  selector: 'ap-plan-list',
  imports: [Status, TranslatePipe],
  template: `
    @if (rows().length === 0) {
      <p class="ap-muted" style="margin: 0">
        {{ 'Nothing changed: the stack file matched what Apiary had.' | t }}
      </p>
    } @else {
      <div class="ap-list">
        @for (row of rows(); track $index) {
          <div class="ap-list-row">
            <div class="ap-list-text">
              <span>
                {{ kindLabels[row.item.kind] | t }} <span class="ap-data">{{ row.item.name }}</span>
                @if (row.item.field) {
                  : {{ fieldLabel(row.item.field) | t }}
                  <span class="ap-data">{{ row.item.from ?? '–' }}</span> →
                  <span class="ap-data">{{ row.item.to ?? '–' }}</span>
                }
              </span>
              @if (row.item.replacedBy) {
                <span class="ap-caption">
                  {{
                    'It replaced a value {name} set {time}. A label sets it now, so it’s locked.'
                      | t: { name: row.item.replacedBy, time: ago(row.item.replacedAt) }
                  }}
                </span>
              }
            </div>
            <ap-status [tone]="row.tone">{{ row.label | t }}</ap-status>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanList {
  readonly plan = input.required<StackPlan>();
  protected readonly kindLabels = kindLabels;
  protected readonly rows = computed<PlanRow[]>(() => {
    const plan = this.plan();
    return [
      ...plan.added.map((item) => ({ item, tone: 'ok' as const, label: 'Added' })),
      ...plan.changed.map((item) => ({
        item,
        tone: item.replacedBy ? ('warn' as const) : ('info' as const),
        label: item.replacedBy ? 'Replaced a change' : 'Changed',
      })),
      ...plan.removed.map((item) => ({ item, tone: 'warn' as const, label: 'Removed' })),
    ];
  });

  protected fieldLabel(field: string): string {
    return fieldLabels[field] ?? field;
  }

  protected ago(iso: string | undefined): string {
    return iso ? timeAgo(iso) : '';
  }
}
