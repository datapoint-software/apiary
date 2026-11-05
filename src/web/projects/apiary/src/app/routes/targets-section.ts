import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Button, Field, I18n, Icon, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus, X } from 'lucide';
import { RouteModel } from './route-model';
import { StackTag } from '../stacks/stack-tag';

const maximumTargets = 10;

@Component({
  selector: 'ap-targets-section',
  imports: [Field, FormField, Button, Icon, StackTag, TranslatePipe],
  templateUrl: './targets-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetsSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  readonly stack = input<string>();
  private readonly i18n = inject(I18n);
  protected readonly icons = { add: Plus, remove: X };
  private readonly model = computed(() => this.route()().value());
  protected readonly many = computed(() => this.model().targets.length > 1);
  protected readonly canAdd = computed(() => !this.stack() && this.model().targets.length < maximumTargets);
  protected readonly canary = computed(() => this.many() && this.model().canary.source !== 'none');
  protected readonly lastTarget = computed(() => this.model().targets.at(-1)?.host || this.i18n.t('the last target'));
  protected readonly split = computed(() =>
    this.model()
      .targets.map((t) => `${t.host || this.i18n.t('target')} ${t.weight ?? 0}%`)
      .join(' · '),
  );

  protected add(): void {
    this.route()().value.update((m) => {
      const targets = m.targets.length === 1 && m.targets[0].weight === 100
        ? [{ ...m.targets[0], weight: 90 }, { host: '', port: m.targets[0].port, weight: 10 }]
        : [...m.targets, { host: '', port: m.targets[0].port, weight: 0 }];
      return { ...m, targets };
    });
  }

  protected remove(index: number): void {
    this.route()().value.update((m) => {
      const targets = [...m.targets.slice(0, index), ...m.targets.slice(index + 1)];
      return { ...m, targets: targets.length === 1 ? [{ ...targets[0], weight: 100 }] : targets };
    });
  }
}
